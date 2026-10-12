import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { NotFoundError } from "@/modules/shared/errors";
import { registrarAuditLog } from "@/modules/shared/audit";
import { recalcularEstadoPagoVentas } from "./estado-pago";
import { aprenderCuentaOrigen } from "./cuenta-origen";
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

    if (input.cuentaOrigen) {
      await aprenderCuentaOrigen(tx, clienteId, input.cuentaOrigen, input.bancoOrigen, creadoPor);
    }

    await recalcularEstadoPagoVentas(tx, clienteId);

    return cobro;
  });
}

/** Adjunta (o reemplaza) la foto del comprobante de un cobro que ya estaba registrado. */
export async function adjuntarComprobanteCobro(cobroId: string, comprobanteUrl: string, usuarioId: string) {
  const cobro = await prisma.movimientoCobro.findUnique({ where: { id: cobroId } });
  if (!cobro) throw new NotFoundError("Cobro no encontrado");

  return prisma.$transaction(async (tx) => {
    const actualizado = await tx.movimientoCobro.update({ where: { id: cobroId }, data: { comprobanteUrl } });
    await registrarAuditLog(tx, {
      tabla: "movimientos_cobro",
      registroId: cobroId,
      accion: "update",
      campoAntes: { comprobanteUrl: cobro.comprobanteUrl },
      campoDespues: { comprobanteUrl },
      usuarioId,
    });
    return actualizado;
  });
}
