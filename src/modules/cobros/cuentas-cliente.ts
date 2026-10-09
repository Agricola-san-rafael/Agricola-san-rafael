import { prisma } from "@/lib/prisma";
import { NotFoundError } from "@/modules/shared/errors";
import { registrarAuditLog } from "@/modules/shared/audit";

export async function listarCuentasOrigen(clienteId: string) {
  return prisma.cuentaOrigenCliente.findMany({
    where: { clienteId },
    orderBy: { createdAt: "asc" },
    select: { id: true, descripcion: true, banco: true, terminacion: true },
  });
}

/** Quita una cuenta que quedó asociada al cliente equivocado; el pago se vuelve a reconocer cuando se confirme con el cliente correcto. */
export async function quitarCuentaOrigen(clienteId: string, cuentaId: string, usuarioId: string) {
  return prisma.$transaction(async (tx) => {
    const cuenta = await tx.cuentaOrigenCliente.findFirst({ where: { id: cuentaId, clienteId } });
    if (!cuenta) throw new NotFoundError("Cuenta no encontrada");
    await tx.cuentaOrigenCliente.delete({ where: { id: cuenta.id } });
    await registrarAuditLog(tx, {
      tabla: "cuentas_origen_cliente",
      registroId: cuenta.id,
      accion: "delete",
      campoAntes: { clienteId, descripcion: cuenta.descripcion, terminacion: cuenta.terminacion },
      usuarioId,
    });
  });
}
