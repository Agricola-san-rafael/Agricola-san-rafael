import { Prisma } from "@/generated/prisma/client";

/**
 * Reparte lo cobrado a un cliente entre sus ventas, de la más antigua a la más
 * nueva, y deja cada venta como pagado / parcial / pendiente según cuánto
 * alcanzó a cubrirse. Coincide con vista_saldo_clientes, que también calcula
 * el saldo a nivel de cliente (ventas - cobros).
 */
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

  let restante = cobros._sum.monto ?? new Prisma.Decimal(0);
  const cero = new Prisma.Decimal(0);

  for (const venta of ventas) {
    let estado: "pagado" | "parcial" | "pendiente";
    if (restante.gte(venta.total)) estado = "pagado";
    else if (restante.gt(cero)) estado = "parcial";
    else estado = "pendiente";

    restante = Prisma.Decimal.max(restante.minus(venta.total), cero);

    if (estado !== venta.estadoPago) {
      await tx.venta.update({ where: { id: venta.id }, data: { estadoPago: estado } });
    }
  }
}
