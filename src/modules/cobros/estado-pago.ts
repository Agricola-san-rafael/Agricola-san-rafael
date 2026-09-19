import { Prisma } from "@/generated/prisma/client";

const CERO = new Prisma.Decimal(0);

/**
 * Reparte lo cobrado a un cliente entre sus ventas (ya ordenadas de la más
 * antigua a la más nueva) y devuelve cuánto queda pendiente de cada una.
 * Coincide con vista_saldo_clientes, que calcula el saldo a nivel de cliente.
 */
export function repartirCobros<T extends { total: Prisma.Decimal }>(
  ventas: T[],
  cobrado: Prisma.Decimal,
) {
  let restante = cobrado;
  return ventas.map((venta) => {
    const cubierto = Prisma.Decimal.min(restante, venta.total);
    restante = restante.minus(cubierto);
    return { venta, pendiente: venta.total.minus(cubierto) };
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
    tx.movimientoCobro.aggregate({ where: { clienteId }, _sum: { monto: true } }),
  ]);

  for (const { venta, pendiente } of repartirCobros(ventas, cobros._sum.monto ?? CERO)) {
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
