import { prisma } from "@/lib/prisma";
import { Prisma, type RolUsuario } from "@/generated/prisma/client";
import { calcularConsumoFIFO, type LoteDisponible } from "./fifo";
import { ConflictError, ForbiddenError, NotFoundError, StockInsuficienteError } from "@/modules/shared/errors";
import { paginatedResponse, type PageParams } from "@/modules/shared/pagination";
import { registrarAuditLog } from "@/modules/shared/audit";
import type { VentaInput } from "./schema";

interface LoteRow {
  id: string;
  kilos_disponibles: string;
  costo_kg: string;
  fecha_ingreso: Date;
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
 * Crea una venta ejecutando el motor FIFO (sección 4.2) dentro de una
 * transacción con bloqueo explícito de filas (SELECT ... FOR UPDATE) sobre
 * los lotes candidatos, para evitar condiciones de carrera entre ventas
 * simultáneas de la misma variedad/calibre.
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
        SELECT id, kilos_disponibles, costo_kg, fecha_ingreso
        FROM lotes_inventario
        WHERE variedad_id = ${input.variedadId}
          AND calibre_id = ${input.calibreId}
          AND kilos_disponibles > 0
        ORDER BY fecha_ingreso ASC
        FOR UPDATE
      `;

      const lotes: LoteDisponible[] = lotesRaw.map((r) => ({
        id: r.id,
        kilosDisponibles: new Prisma.Decimal(r.kilos_disponibles),
        costoKg: new Prisma.Decimal(r.costo_kg),
        fechaIngreso: r.fecha_ingreso,
      }));

      const { consumos, kilosFaltantes } = calcularConsumoFIFO(lotes, kilosSolicitados);

      if (kilosFaltantes.gt(0) && !forzar) {
        throw new StockInsuficienteError(kilosFaltantes.toNumber());
      }

      let consumosFinales = consumos;
      const fueForzada = kilosFaltantes.gt(0) && forzar;
      if (fueForzada) {
        if (consumos.length === 0) {
          throw new ConflictError(
            "No existe ningún lote de esta variedad/calibre — no hay nada que forzar"
          );
        }
        const ultimo = consumos[consumos.length - 1];
        consumosFinales = [
          ...consumos.slice(0, -1),
          { ...ultimo, kilosConsumidos: ultimo.kilosConsumidos.add(kilosFaltantes) },
        ];
      }

      const costoTotal = consumosFinales.reduce(
        (acc, c) => acc.add(c.kilosConsumidos.mul(c.costoKgLote)),
        new Prisma.Decimal(0)
      );
      const margen = total.sub(costoTotal);
      const margenPct = total.gt(0) ? margen.div(total) : new Prisma.Decimal(0);

      const venta = await tx.venta.create({
        data: {
          fecha: new Date(input.fecha),
          clienteId: input.clienteId,
          variedadId: input.variedadId,
          calibreId: input.calibreId,
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

      for (const consumo of consumosFinales) {
        await tx.ventaLote.create({
          data: {
            ventaId: venta.id,
            loteId: consumo.loteId,
            kilosConsumidos: consumo.kilosConsumidos,
            costoKgLote: consumo.costoKgLote,
          },
        });

        const loteActualizado = await tx.loteInventario.update({
          where: { id: consumo.loteId },
          data: { kilosDisponibles: { decrement: consumo.kilosConsumidos } },
        });

        if (loteActualizado.kilosDisponibles.lte(0) && loteActualizado.estado !== "agotado") {
          await tx.loteInventario.update({
            where: { id: consumo.loteId },
            data: { estado: "agotado" },
          });
        }
      }

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
            mensaje: `Intento de venta bloqueado: faltaron ${error.kilosFaltantes} kg de variedad/calibre solicitado`,
          },
        })
        .catch(() => {
          // No dejar que un fallo al registrar la alerta oculte el 409 original.
        });
    }
    throw error;
  }
}
