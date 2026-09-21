import { Prisma } from "@/generated/prisma/client";

const CERO = new Prisma.Decimal(0);

interface Movimiento {
  monto: Prisma.Decimal;
  ventaId: string | null;
}

/**
 * Separa los pagos entre los que se hicieron a una venta puntual (los que la app
 * crea sola al registrar una venta como pagada, o los que se ligan a mano) y los
 * "libres", que se reparten entre las ventas más antiguas.
 */
export function separarAbonos(movimientos: Movimiento[], idsVentas: Set<string>) {
  const abonadoPorVenta = new Map<string, Prisma.Decimal>();
  let libre = CERO;
  for (const m of movimientos) {
    if (m.ventaId && idsVentas.has(m.ventaId)) {
      abonadoPorVenta.set(m.ventaId, (abonadoPorVenta.get(m.ventaId) ?? CERO).add(m.monto));
    } else {
      libre = libre.add(m.monto);
    }
  }
  return { abonadoPorVenta, libre };
}

/**
 * Reparte lo cobrado a un cliente entre sus ventas (ya ordenadas de la más
 * antigua a la más nueva) y devuelve cuánto queda pendiente de cada una.
 * Primero se descuenta lo pagado directamente a cada venta; lo que sobra de eso
 * y los pagos libres se aplican a las más antiguas. Coincide con
 * vista_saldo_clientes, que calcula el saldo a nivel de cliente.
 */
export function repartirCobros<T extends { id?: string; total: Prisma.Decimal }>(
  ventas: T[],
  libre: Prisma.Decimal,
  abonadoPorVenta: Map<string, Prisma.Decimal> = new Map(),
) {
  let restante = libre;
  const iniciales = ventas.map((venta) => {
    const abonado = (venta.id && abonadoPorVenta.get(venta.id)) || CERO;
    const cubierto = Prisma.Decimal.min(abonado, venta.total);
    restante = restante.add(abonado.sub(cubierto));
    return { venta, pendiente: venta.total.sub(cubierto) };
  });
  return iniciales.map(({ venta, pendiente }) => {
    const aplicado = Prisma.Decimal.min(restante, pendiente);
    restante = restante.sub(aplicado);
    return { venta, pendiente: pendiente.sub(aplicado) };
  });
}

/** Deja cada venta del cliente como pagado / parcial / pendiente según lo cobrado. */
export async function recalcularEstadoPagoVentas(
  tx: Prisma.TransactionClient,
  clienteId: string,
) {
  const [ventas, cobros] = await Promise.all([
    tx.venta.findMany({
      where: { clienteId },
      orderBy: [{ fecha: "asc" }, { createdAt: "asc" }],
      select: { id: true, total: true, estadoPago: true },
    }),
    tx.movimientoCobro.findMany({ where: { clienteId }, select: { monto: true, ventaId: true } }),
  ]);

  const { abonadoPorVenta, libre } = separarAbonos(cobros, new Set(ventas.map((v) => v.id)));
  for (const { venta, pendiente } of repartirCobros(ventas, libre, abonadoPorVenta)) {
    const estado = pendiente.lte(CERO)
      ? "pagado"
      : pendiente.gte(venta.total)
        ? "pendiente"
        : "parcial";
    if (estado !== venta.estadoPago) {
      await tx.venta.update({ where: { id: venta.id }, data: { estadoPago: estado } });
    }
  }
}
