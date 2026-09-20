import { Prisma } from "@/generated/prisma/client";
import { repartirCobros as repartirPagos } from "@/modules/cobros/estado-pago";

const CERO = new Prisma.Decimal(0);

/** Deja cada compra del proveedor como pagado / parcial / pendiente según lo pagado, de la más antigua a la más nueva. */
export async function recalcularEstadoPagoCompras(
  tx: Prisma.TransactionClient,
  proveedorId: string,
) {
  const [compras, pagos] = await Promise.all([
    tx.compra.findMany({
      where: { proveedorId },
      orderBy: [{ fecha: "asc" }, { createdAt: "asc" }],
      select: { id: true, total: true, estadoPago: true },
    }),
    tx.movimientoPago.aggregate({ where: { proveedorId }, _sum: { monto: true } }),
  ]);

  for (const { venta: compra, pendiente } of repartirPagos(compras, pagos._sum.monto ?? CERO)) {
    const estado = pendiente.lte(CERO) ? "pagado" : pendiente.gte(compra.total) ? "pendiente" : "parcial";
    if (estado !== compra.estadoPago) {
      await tx.compra.update({ where: { id: compra.id }, data: { estadoPago: estado } });
    }
  }
}
