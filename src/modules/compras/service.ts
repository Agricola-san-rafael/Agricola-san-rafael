import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { ConflictError, NotFoundError } from "@/modules/shared/errors";
import { paginatedResponse, type PageParams } from "@/modules/shared/pagination";
import { registrarAuditLog } from "@/modules/shared/audit";
import type { CompraInput, CompraUpdateInput } from "./schema";

/** Código correlativo legible para identificar el lote manualmente al vender (ej. LOTE-0125). */
async function generarSkuLote(tx: Prisma.TransactionClient): Promise<string> {
  const [{ nextval }] = await tx.$queryRaw<{ nextval: bigint }[]>`SELECT nextval('lote_sku_seq')`;
  return `LOTE-${nextval.toString().padStart(4, "0")}`;
}

export interface FiltrosCompras {
  desde?: string;
  hasta?: string;
  proveedorId?: string;
  estadoPago?: "pagado" | "pendiente" | "parcial";
}

export async function listarCompras(params: PageParams, filtros: FiltrosCompras) {
  const where: Prisma.CompraWhereInput = {
    proveedorId: filtros.proveedorId,
    estadoPago: filtros.estadoPago,
    fecha: {
      gte: filtros.desde ? new Date(filtros.desde) : undefined,
      lte: filtros.hasta ? new Date(filtros.hasta) : undefined,
    },
  };

  const [data, total] = await Promise.all([
    prisma.compra.findMany({
      where,
      orderBy: { fecha: "desc" },
      skip: params.skip,
      take: params.take,
      include: { proveedor: true, variedad: true, calibre: true },
    }),
    prisma.compra.count({ where }),
  ]);
  return paginatedResponse(data, total, params);
}

export async function obtenerCompra(id: string) {
  const compra = await prisma.compra.findUnique({
    where: { id },
    include: { proveedor: true, variedad: true, calibre: true, lote: true },
  });
  if (!compra) throw new NotFoundError("Compra no encontrada");
  return compra;
}

/**
 * Crea una compra y su lote de inventario asociado en una sola transacción
 * (sección 5.1: "al crear una compra, se genera automáticamente un lote").
 */
export async function crearCompra(input: CompraInput, creadoPor: string) {
  const kilos = new Prisma.Decimal(input.kilos);
  const precioKg = new Prisma.Decimal(input.precioKg);
  const total = kilos.mul(precioKg);

  return prisma.$transaction(async (tx) => {
    const compra = await tx.compra.create({
      data: {
        fecha: new Date(input.fecha),
        proveedorId: input.proveedorId,
        variedadId: input.variedadId,
        calibreId: input.calibreId,
        kilos,
        nCajas: input.nCajas,
        precioKg,
        total,
        formaPago: input.formaPago,
        estadoPago: input.estadoPago,
        nFactura: input.nFactura,
        neto: input.neto !== undefined ? new Prisma.Decimal(input.neto) : undefined,
        iva: input.iva !== undefined ? new Prisma.Decimal(input.iva) : undefined,
        observaciones: input.observaciones,
        createdById: creadoPor,
      },
    });

    await tx.loteInventario.create({
      data: {
        sku: await generarSkuLote(tx),
        compraId: compra.id,
        variedadId: input.variedadId,
        calibreId: input.calibreId,
        fechaIngreso: compra.fecha,
        kilosIniciales: kilos,
        kilosDisponibles: kilos,
        costoKg: precioKg,
        estado: "disponible",
      },
    });

    await registrarAuditLog(tx, {
      tabla: "compras",
      registroId: compra.id,
      accion: "create",
      campoDespues: {
        kilos: kilos.toNumber(),
        precioKg: precioKg.toNumber(),
        total: total.toNumber(),
        estadoPago: compra.estadoPago,
      },
      usuarioId: creadoPor,
    });

    return compra;
  });
}

export async function actualizarCompra(id: string, input: CompraUpdateInput, actualizadoPor: string) {
  const compra = await prisma.compra.findUnique({ where: { id }, include: { lote: true } });
  if (!compra) throw new NotFoundError("Compra no encontrada");

  const cambiaCantidadOCosto =
    input.kilos !== undefined ||
    input.precioKg !== undefined ||
    input.variedadId !== undefined ||
    input.calibreId !== undefined;

  const loteYaConsumido =
    compra.lote && !compra.lote.kilosDisponibles.equals(compra.lote.kilosIniciales);

  if (cambiaCantidadOCosto && loteYaConsumido) {
    throw new ConflictError(
      "No se puede modificar kilos, precio, variedad o calibre: el lote de esta compra ya tiene ventas asociadas"
    );
  }

  return prisma.$transaction(async (tx) => {
    const kilos = input.kilos !== undefined ? new Prisma.Decimal(input.kilos) : undefined;
    const precioKg = input.precioKg !== undefined ? new Prisma.Decimal(input.precioKg) : undefined;
    const total =
      kilos !== undefined || precioKg !== undefined
        ? (kilos ?? compra.kilos).mul(precioKg ?? compra.precioKg)
        : undefined;

    const compraActualizada = await tx.compra.update({
      where: { id },
      data: {
        fecha: input.fecha ? new Date(input.fecha) : undefined,
        proveedorId: input.proveedorId,
        variedadId: input.variedadId,
        calibreId: input.calibreId,
        kilos,
        nCajas: input.nCajas,
        precioKg,
        total,
        formaPago: input.formaPago,
        estadoPago: input.estadoPago,
        nFactura: input.nFactura,
        neto: input.neto !== undefined ? new Prisma.Decimal(input.neto) : undefined,
        iva: input.iva !== undefined ? new Prisma.Decimal(input.iva) : undefined,
        observaciones: input.observaciones,
      },
    });

    if (cambiaCantidadOCosto && compra.lote) {
      await tx.loteInventario.update({
        where: { id: compra.lote.id },
        data: {
          variedadId: input.variedadId,
          calibreId: input.calibreId,
          fechaIngreso: input.fecha ? new Date(input.fecha) : undefined,
          kilosIniciales: kilos,
          kilosDisponibles: kilos,
          costoKg: precioKg,
        },
      });
    }

    await registrarAuditLog(tx, {
      tabla: "compras",
      registroId: id,
      accion: "update",
      campoAntes: {
        kilos: compra.kilos.toNumber(),
        precioKg: compra.precioKg.toNumber(),
        total: compra.total.toNumber(),
        estadoPago: compra.estadoPago,
      },
      campoDespues: {
        kilos: compraActualizada.kilos.toNumber(),
        precioKg: compraActualizada.precioKg.toNumber(),
        total: compraActualizada.total.toNumber(),
        estadoPago: compraActualizada.estadoPago,
      },
      usuarioId: actualizadoPor,
    });

    return compraActualizada;
  });
}
