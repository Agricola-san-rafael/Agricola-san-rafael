import { prisma } from "@/lib/prisma";
import { ConflictError, NotFoundError } from "@/modules/shared/errors";
import { registrarAuditLog } from "@/modules/shared/audit";
import { PREFIJO_PAGO_AUTOMATICO } from "@/modules/shared/anulacion";
import { recalcularEstadoPagoCompras } from "@/modules/pagos/estado-pago";

/**
 * Anula una compra: borra su lote (solo si nadie lo ha tocado), el pago que la
 * app creó sola al registrarla como pagada, y deja sueltos los pagos hechos a
 * mano. La compra borrada queda guardada en Auditoría.
 */
export async function anularCompra(id: string, motivo: string, usuarioId: string) {
  return prisma.$transaction(async (tx) => {
    const compra = await tx.compra.findUnique({
      where: { id },
      include: { lote: true, proveedor: { select: { nombre: true } }, calibre: true, variedad: true },
    });
    if (!compra) throw new NotFoundError("Compra no encontrada");

    if (compra.lote) {
      const ventasDelLote = await tx.ventaLote.count({ where: { loteId: compra.lote.id } });
      const intacto = compra.lote.kilosDisponibles.equals(compra.lote.kilosIniciales);
      if (ventasDelLote > 0 || !intacto) {
        throw new ConflictError(
          "El lote de esta compra ya tiene ventas o ajustes de stock; anula o corrige primero esas ventas",
        );
      }
      await tx.loteInventario.delete({ where: { id: compra.lote.id } });
    }

    await tx.movimientoPago.deleteMany({
      where: { compraId: id, referencia: { startsWith: PREFIJO_PAGO_AUTOMATICO } },
    });
    await tx.movimientoPago.updateMany({ where: { compraId: id }, data: { compraId: null } });
    await tx.alerta.deleteMany({ where: { entidadTipo: "compra", entidadId: id } });

    await registrarAuditLog(tx, {
      tabla: "compras",
      registroId: id,
      accion: "delete",
      campoAntes: {
        proveedor: compra.proveedor.nombre,
        fecha: compra.fecha.toISOString().slice(0, 10),
        producto: `${compra.variedad.nombre} ${compra.calibre.codigo}`,
        kilos: compra.kilos.toNumber(),
        precioKg: compra.precioKg.toNumber(),
        total: compra.total.toNumber(),
        estadoPago: compra.estadoPago,
        motivo,
      },
      usuarioId,
    });

    await tx.compra.delete({ where: { id } });
    await recalcularEstadoPagoCompras(tx, compra.proveedorId);
    return { id, total: compra.total.toNumber() };
  });
}
