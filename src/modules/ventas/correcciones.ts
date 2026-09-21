import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { ConflictError, NotFoundError, StockInsuficienteError } from "@/modules/shared/errors";
import { registrarAuditLog } from "@/modules/shared/audit";
import { PREFIJO_PAGO_AUTOMATICO } from "@/modules/shared/anulacion";
import { recalcularEstadoPagoVentas } from "@/modules/cobros/estado-pago";
import type { VentaCorreccionInput } from "./schema";

/**
 * Anula una venta: devuelve los kilos al lote, borra el cobro que la app creó
 * sola al registrarla como pagada, y deja sueltos (sin venta) los cobros que
 * se registraron a mano. La venta borrada queda guardada en Auditoría.
 */
export async function anularVenta(id: string, motivo: string, usuarioId: string) {
  return prisma.$transaction(async (tx) => {
    const venta = await tx.venta.findUnique({
      where: { id },
      include: { ventaLotes: true, cliente: { select: { nombre: true } }, calibre: true, variedad: true },
    });
    if (!venta) throw new NotFoundError("Venta no encontrada");

    for (const vl of venta.ventaLotes) {
      await tx.loteInventario.update({
        where: { id: vl.loteId },
        data: { kilosDisponibles: { increment: vl.kilosConsumidos }, estado: "disponible" },
      });
    }
    await tx.ventaLote.deleteMany({ where: { ventaId: id } });
    await tx.movimientoCobro.deleteMany({
      where: { ventaId: id, referencia: { startsWith: PREFIJO_PAGO_AUTOMATICO } },
    });
    await tx.movimientoCobro.updateMany({ where: { ventaId: id }, data: { ventaId: null } });
    await tx.alerta.deleteMany({ where: { entidadTipo: "venta", entidadId: id } });

    await registrarAuditLog(tx, {
      tabla: "ventas",
      registroId: id,
      accion: "delete",
      campoAntes: {
        cliente: venta.cliente.nombre,
        fecha: venta.fecha.toISOString().slice(0, 10),
        producto: `${venta.variedad.nombre} ${venta.calibre.codigo}`,
        kilos: venta.kilos.toNumber(),
        precioKg: venta.precioKg.toNumber(),
        total: venta.total.toNumber(),
        estadoPago: venta.estadoPago,
        motivo,
      },
      usuarioId,
    });

    await tx.venta.delete({ where: { id } });
    await recalcularEstadoPagoVentas(tx, venta.clienteId);
    return { id, total: venta.total.toNumber() };
  });
}

/**
 * Corrige fecha, kilos, precio, documento u observaciones de una venta. Si
 * cambian los kilos, ajusta el stock del lote (solo si la venta salió de un
 * único lote). El total, el margen y el cobro automático se recalculan.
 */
export async function actualizarVenta(id: string, input: VentaCorreccionInput, usuarioId: string) {
  return prisma.$transaction(async (tx) => {
    const venta = await tx.venta.findUnique({ where: { id }, include: { ventaLotes: true } });
    if (!venta) throw new NotFoundError("Venta no encontrada");

    const kilos = input.kilos !== undefined ? new Prisma.Decimal(input.kilos) : venta.kilos;
    const precioKg = input.precioKg !== undefined ? new Prisma.Decimal(input.precioKg) : venta.precioKg;
    const cambianKilos = !kilos.equals(venta.kilos);

    if (cambianKilos) {
      if (venta.ventaLotes.length !== 1) {
        throw new ConflictError(
          "Esta venta salió de más de un lote; para cambiar los kilos anúlala y vuelve a registrarla",
        );
      }
      const vl = venta.ventaLotes[0];
      const delta = kilos.sub(venta.kilos);
      const [lote] = await tx.$queryRaw<{ kilos_disponibles: Prisma.Decimal }[]>`
        SELECT kilos_disponibles FROM lotes_inventario WHERE id = ${vl.loteId} FOR UPDATE
      `;
      const disponible = new Prisma.Decimal(lote.kilos_disponibles);
      if (delta.gt(disponible)) throw new StockInsuficienteError(delta.sub(disponible).toNumber());

      const restante = disponible.sub(delta);
      await tx.loteInventario.update({
        where: { id: vl.loteId },
        data: { kilosDisponibles: restante, estado: restante.lte(0) ? "agotado" : "disponible" },
      });
      await tx.ventaLote.update({ where: { id: vl.id }, data: { kilosConsumidos: kilos } });
    }

    const costoTotal = cambianKilos
      ? (await tx.ventaLote.findMany({ where: { ventaId: id } })).reduce(
          (acc, vl) => acc.add(vl.kilosConsumidos.mul(vl.costoKgLote)),
          new Prisma.Decimal(0),
        )
      : venta.costoTotal;
    const total = kilos.mul(precioKg);
    const margen = total.sub(costoTotal);
    const margenPct = total.gt(0) ? margen.div(total) : new Prisma.Decimal(0);

    const actualizada = await tx.venta.update({
      where: { id },
      data: {
        fecha: input.fecha ? new Date(input.fecha) : undefined,
        kilos,
        precioKg,
        total,
        costoTotal,
        margen,
        margenPct,
        tipoDocumento: input.tipoDocumento,
        nDocumento: input.nDocumento,
        observaciones: input.observaciones,
      },
    });

    const automaticos = await tx.movimientoCobro.findMany({
      where: { ventaId: id, referencia: { startsWith: PREFIJO_PAGO_AUTOMATICO } },
    });
    if (automaticos.length === 1) {
      await tx.movimientoCobro.update({
        where: { id: automaticos[0].id },
        data: { monto: total, fecha: input.fecha ? new Date(input.fecha) : undefined },
      });
    }
    await recalcularEstadoPagoVentas(tx, venta.clienteId);

    await registrarAuditLog(tx, {
      tabla: "ventas",
      registroId: id,
      accion: "update",
      campoAntes: {
        kilos: venta.kilos.toNumber(),
        precioKg: venta.precioKg.toNumber(),
        total: venta.total.toNumber(),
        fecha: venta.fecha.toISOString().slice(0, 10),
      },
      campoDespues: {
        kilos: kilos.toNumber(),
        precioKg: precioKg.toNumber(),
        total: total.toNumber(),
        fecha: actualizada.fecha.toISOString().slice(0, 10),
      },
      usuarioId,
    });
    return actualizada;
  });
}
