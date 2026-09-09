import { prisma } from "@/lib/prisma";
import { Prisma, type RolUsuario } from "@/generated/prisma/client";
import { ForbiddenError, NotFoundError, StockInsuficienteError } from "@/modules/shared/errors";
import { paginatedResponse, type PageParams } from "@/modules/shared/pagination";
import { registrarAuditLog } from "@/modules/shared/audit";
import type { VentaInput } from "./schema";

interface LoteRow {
  id: string;
  variedad_id: string;
  calibre_id: string;
  kilos_disponibles: string;
  costo_kg: string;
  estado: string;
}

export interface FiltrosVentas {
  desde?: string;
  hasta?: string;
  clienteId?: string;
  estadoPago?: "pagado" | "pendiente" | "parcial";
}

export async function listarVentas(params: PageParams, filtros: FiltrosVentas) {
  const where: Prisma.VentaWhereInput = {
    clienteId: filtros.clienteId,
    estadoPago: filtros.estadoPago,
    fecha: {
      gte: filtros.desde ? new Date(filtros.desde) : undefined,
      lte: filtros.hasta ? new Date(filtros.hasta) : undefined,
    },
  };

  const [data, total] = await Promise.all([
    prisma.venta.findMany({
      where,
      orderBy: { fecha: "desc" },
      skip: params.skip,
      take: params.take,
      include: { cliente: true, variedad: true, calibre: true },
    }),
    prisma.venta.count({ where }),
  ]);
  return paginatedResponse(data, total, params);
}

export async function obtenerVenta(id: string) {
  const venta = await prisma.venta.findUnique({
    where: { id },
    include: {
      cliente: true,
      variedad: true,
      calibre: true,
      ventaLotes: { include: { lote: true } },
    },
  });
  if (!venta) throw new NotFoundError("Venta no encontrada");
  return venta;
}

/**
 * Crea una venta descontando de un lote elegido manualmente por SKU
 * (decisión del usuario 09-09-2026, reemplaza el consumo automático FIFO)
 * dentro de una transacción con bloqueo explícito (SELECT ... FOR UPDATE)
 * para evitar condiciones de carrera entre ventas simultáneas del mismo lote.
 */
export async function crearVenta(input: VentaInput, usuarioId: string, rol: RolUsuario) {
  const kilosSolicitados = new Prisma.Decimal(input.kilos);
  const precioKg = new Prisma.Decimal(input.precioKg);
  const total = kilosSolicitados.mul(precioKg);
  const forzar = input.forzarVenta === true;

  if (forzar && rol !== "admin") {
    throw new ForbiddenError("Solo un administrador puede forzar una venta que excede el stock");
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const lotesRaw = await tx.$queryRaw<LoteRow[]>`
        SELECT id, variedad_id, calibre_id, kilos_disponibles, costo_kg, estado
        FROM lotes_inventario
        WHERE id = ${input.loteId}
        FOR UPDATE
      `;
      const lote = lotesRaw[0];
      if (!lote) throw new NotFoundError("Lote no encontrado");

      const kilosDisponibles = new Prisma.Decimal(lote.kilos_disponibles);
      const costoKgLote = new Prisma.Decimal(lote.costo_kg);
      const kilosFaltantes = kilosSolicitados.gt(kilosDisponibles)
        ? kilosSolicitados.sub(kilosDisponibles)
        : new Prisma.Decimal(0);

      if (kilosFaltantes.gt(0) && !forzar) {
        throw new StockInsuficienteError(kilosFaltantes.toNumber());
      }

      const fueForzada = kilosFaltantes.gt(0) && forzar;
      const costoTotal = kilosSolicitados.mul(costoKgLote);
      const margen = total.sub(costoTotal);
      const margenPct = total.gt(0) ? margen.div(total) : new Prisma.Decimal(0);

      const venta = await tx.venta.create({
        data: {
          fecha: new Date(input.fecha),
          clienteId: input.clienteId,
          variedadId: lote.variedad_id,
          calibreId: lote.calibre_id,
          kilos: kilosSolicitados,
          precioKg,
          total,
          costoTotal,
          margen,
          margenPct,
          formaPago: input.formaPago,
          estadoPago: input.estadoPago,
          tipoDocumento: input.tipoDocumento,
          nDocumento: input.nDocumento,
          observaciones: input.observaciones,
          forzada: fueForzada,
          createdById: usuarioId,
        },
      });

      await tx.ventaLote.create({
        data: {
          ventaId: venta.id,
          loteId: lote.id,
          kilosConsumidos: kilosSolicitados,
          costoKgLote,
        },
      });

      const kilosRestantes = kilosDisponibles.sub(kilosSolicitados);
      await tx.loteInventario.update({
        where: { id: lote.id },
        data: {
          kilosDisponibles: kilosRestantes,
          estado: kilosRestantes.lte(0) ? "agotado" : undefined,
        },
      });

      if (fueForzada) {
        await tx.alerta.create({
          data: {
            tipo: "sobreventa_stock",
            entidadTipo: "venta",
            entidadId: venta.id,
            fechaDisparo: new Date(),
            canal: "push",
            mensaje: `Venta ${venta.id} forzada sobre stock: faltaron ${kilosFaltantes.toString()} kg`,
          },
        });
      }

      await registrarAuditLog(tx, {
        tabla: "ventas",
        registroId: venta.id,
        accion: "create",
        campoDespues: {
          kilos: kilosSolicitados.toNumber(),
          precioKg: precioKg.toNumber(),
          total: total.toNumber(),
          costoTotal: costoTotal.toNumber(),
          margen: margen.toNumber(),
          forzada: fueForzada,
        },
        usuarioId,
      });

      return venta;
    });
  } catch (error) {
    if (error instanceof StockInsuficienteError) {
      // La transacción principal abortó (rollback) porque no se forzó la venta.
      // Se registra la alerta fuera de esa transacción para trazar el intento
      // (sección 5.4), sin bloquear la respuesta 409 al usuario.
      await prisma.alerta
        .create({
          data: {
            tipo: "sobreventa_stock",
            entidadTipo: "cliente",
            entidadId: input.clienteId,
            fechaDisparo: new Date(),
            canal: "push",
            mensaje: `Intento de venta bloqueado: faltaron ${error.kilosFaltantes} kg del lote seleccionado`,
          },
        })
        .catch(() => {
          // No dejar que un fallo al registrar la alerta oculte el 409 original.
        });
    }
    throw error;
  }
}
