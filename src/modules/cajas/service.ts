import { prisma } from "@/lib/prisma";
import { NotFoundError, ValidationError } from "@/modules/shared/errors";
import { registrarAuditLog } from "@/modules/shared/audit";

export async function listarTiposCaja() {
  return prisma.tipoCaja.findMany({ orderBy: { nombre: "asc" } });
}

/**
 * Ajuste manual del stock de cajas (no se descuenta automáticamente al
 * comprar/vender palta, decisión del usuario 16-09-2026): mismo patrón que
 * el ajuste de stock de lotes, documentado en audit_log.
 */
export async function ajustarStockCaja(tipoCajaId: string, cantidad: number, motivo: string, usuarioId: string) {
  return prisma.$transaction(async (tx) => {
    const tipoCaja = await tx.tipoCaja.findUnique({ where: { id: tipoCajaId } });
    if (!tipoCaja) throw new NotFoundError("Tipo de caja no encontrado");

    const stockDespues = tipoCaja.stockActual + cantidad;
    if (stockDespues < 0) {
      throw new ValidationError(`El ajuste dejaría el stock en ${stockDespues} (negativo)`);
    }

    const actualizado = await tx.tipoCaja.update({
      where: { id: tipoCajaId },
      data: { stockActual: stockDespues },
    });

    await registrarAuditLog(tx, {
      tabla: "tipos_caja",
      registroId: tipoCajaId,
      accion: "update",
      campoAntes: { stockActual: tipoCaja.stockActual },
      campoDespues: { stockActual: stockDespues, motivo },
      usuarioId,
    });

    return actualizado;
  });
}
