import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { NotFoundError } from "@/modules/shared/errors";
import { registrarAuditLog } from "@/modules/shared/audit";
import type { PagoInput } from "./schema";

export async function crearPago(proveedorId: string, input: PagoInput, creadoPor: string) {
  const proveedor = await prisma.proveedor.findUnique({ where: { id: proveedorId } });
  if (!proveedor) throw new NotFoundError("Proveedor no encontrado");

  return prisma.$transaction(async (tx) => {
    const pago = await tx.movimientoPago.create({
      data: {
        proveedorId,
        fecha: new Date(input.fecha),
        monto: new Prisma.Decimal(input.monto),
        medioPago: input.medioPago,
        referencia: input.referencia,
        compraId: input.compraId,
        comprobanteUrl: input.comprobanteUrl,
        createdById: creadoPor,
      },
    });

    await registrarAuditLog(tx, {
      tabla: "movimientos_pago",
      registroId: pago.id,
      accion: "create",
      campoDespues: { monto: Number(pago.monto), medioPago: pago.medioPago },
      usuarioId: creadoPor,
    });

    return pago;
  });
}
