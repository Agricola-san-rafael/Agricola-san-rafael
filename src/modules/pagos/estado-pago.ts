import { Prisma } from "@/generated/prisma/client";
import { repartirCobros as repartirPagos, separarAbonos } from "@/modules/cobros/estado-pago";

const CERO = new Prisma.Decimal(0);

/** Deja cada compra del proveedor como pagado / parcial / pendiente según lo pagado. Los pagos ligados a una compra se le aplican primero a ella; el resto, a las más antiguas. */
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
    tx.movimientoPago.findMany({ where: { proveedorId }, select: { monto: true, compraId: true } }),
  ]);

  const { abonadoPorVenta, libre } = separarAbonos(
    pagos.map((p) => ({ monto: p.monto, ventaId: p.compraId })),
    new Set(compras.map((c) => c.id)),
  );
  for (const { venta: compra, pendiente } of repartirPagos(compras, libre, abonadoPorVenta)) {
    const estado = pendiente.lte(CERO) ? "pagado" : pendiente.gte(compra.total) ? "pendiente" : "parcial";
    if (estado !== compra.estadoPago) {
      await tx.compra.update({ where: { id: compra.id }, data: { estadoPago: estado } });
    }
  }
}
