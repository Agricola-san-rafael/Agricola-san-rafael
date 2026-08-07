import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { NotFoundError } from "@/modules/shared/errors";
import { registrarAuditLog } from "@/modules/shared/audit";
import type { CobroInput } from "./schema";

export async function crearCobro(clienteId: string, input: CobroInput, creadoPor: string) {
  const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } });
  if (!cliente) throw new NotFoundError("Cliente no encontrado");

  return prisma.$transaction(async (tx) => {
    const cobro = await tx.movimientoCobro.create({
      data: {
        clienteId,
        fecha: new Date(input.fecha),
        monto: new Prisma.Decimal(input.monto),
        medioPago: input.medioPago,
        referencia: input.referencia,
        ventaId: input.ventaId,
        comprobanteUrl: input.comprobanteUrl,
        createdById: creadoPor,
      },
    });

    await registrarAuditLog(tx, {
      tabla: "movimientos_cobro",
      registroId: cobro.id,
      accion: "create",
      campoDespues: { monto: Number(cobro.monto), medioPago: cobro.medioPago },
      usuarioId: creadoPor,
    });

    return cobro;
  });
}
