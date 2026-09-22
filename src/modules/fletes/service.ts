import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { NotFoundError } from "@/modules/shared/errors";
import { registrarAuditLog } from "@/modules/shared/audit";
import { calcularFletePorVenta, costoParaAgricola } from "./imputacion";
import type { FleteInput } from "./schema";

export async function crearFlete(input: FleteInput, creadoPor: string) {
  const costoTotal = new Prisma.Decimal(input.costoCombustible)
    .add(input.costoChofer)
    .add(input.costoPeajes)
    .add(input.costoOtros);

  return prisma.$transaction(async (tx) => {
    const flete = await tx.flete.create({
      data: {
        fecha: new Date(input.fecha),
        tipo: input.tipo,
        compraId: input.tipo === "compra" ? input.compraId : undefined,
        ventaId: input.tipo === "venta" ? input.ventaId : undefined,
        clienteId: input.tipo === "tercero" ? input.clienteId : undefined,
        terceroNombre: input.tipo === "tercero" ? input.terceroNombre : undefined,
        origen: input.origen,
        destino: input.destino,
        kilos: input.kilos !== undefined ? new Prisma.Decimal(input.kilos) : undefined,
        vehiculo: input.vehiculo,
        km: input.km !== undefined ? new Prisma.Decimal(input.km) : undefined,
        chofer: input.chofer,
        estadoCobro: input.tipo === "tercero" ? input.estadoCobro : "cobrado",
        fechaCobro: input.tipo !== "tercero" || input.estadoCobro === "cobrado" ? new Date(input.fecha) : undefined,
        nFactura: input.nFactura,
        totalFacturado: input.totalFacturado !== undefined ? new Prisma.Decimal(input.totalFacturado) : undefined,
        costoCombustible: new Prisma.Decimal(input.costoCombustible),
        costoChofer: new Prisma.Decimal(input.costoChofer),
        costoPeajes: new Prisma.Decimal(input.costoPeajes),
        costoOtros: new Prisma.Decimal(input.costoOtros),
        costoTotal,
        tarifaCobrada: input.tarifaCobrada !== undefined ? new Prisma.Decimal(input.tarifaCobrada) : undefined,
        observaciones: input.observaciones,
        createdById: creadoPor,
      },
    });
    if (input.chofer && input.costoChofer > 0) {
      await tx.movimientoChofer.create({
        data: {
          fecha: new Date(input.fecha),
          chofer: input.chofer,
          monto: new Prisma.Decimal(input.costoChofer),
          concepto: `Pago del viaje ${[input.origen, input.destino].filter(Boolean).join(" → ") || input.fecha}`,
          fleteId: flete.id,
          createdById: creadoPor,
        },
      });
    }
    await registrarAuditLog(tx, {
      tabla: "fletes",
      registroId: flete.id,
      accion: "create",
      campoDespues: { tipo: flete.tipo, costoTotal: costoTotal.toNumber(), tarifaCobrada: input.tarifaCobrada ?? null },
      usuarioId: creadoPor,
    });
    return flete;
  });
}

export async function eliminarFlete(id: string, usuarioId: string) {
  return prisma.$transaction(async (tx) => {
    const flete = await tx.flete.findUnique({ where: { id } });
    if (!flete) throw new NotFoundError("Flete no encontrado");
    await registrarAuditLog(tx, {
      tabla: "fletes",
      registroId: id,
      accion: "delete",
      campoAntes: {
        fecha: flete.fecha.toISOString().slice(0, 10),
        tipo: flete.tipo,
        costoTotal: flete.costoTotal.toNumber(),
        tarifaCobrada: flete.tarifaCobrada?.toNumber() ?? null,
      },
      usuarioId,
    });
    await tx.flete.delete({ where: { id } });
    return { id };
  });
}

/** Flete imputado a cada venta (propio + prorrateado de su compra). Sin ids, calcula para todas. */
export async function obtenerFletePorVenta(): Promise<Map<string, number>> {
  const fletes = await prisma.flete.findMany({
    where: { tipo: { in: ["compra", "venta"] } },
    select: { tipo: true, compraId: true, ventaId: true, costoTotal: true, tarifaCobrada: true },
  });
  const comprasConFlete = [...new Set(fletes.filter((f) => f.tipo === "compra" && f.compraId).map((f) => f.compraId!))];

  const [compras, consumos] = comprasConFlete.length
    ? await Promise.all([
        prisma.compra.findMany({ where: { id: { in: comprasConFlete } }, select: { id: true, kilos: true } }),
        prisma.ventaLote.findMany({
          where: { lote: { compraId: { in: comprasConFlete } } },
          select: { ventaId: true, kilosConsumidos: true, lote: { select: { compraId: true } } },
        }),
      ])
    : [[], []];

  return calcularFletePorVenta({
    fletes: fletes.map((f) => ({
      tipo: f.tipo,
      compraId: f.compraId,
      ventaId: f.ventaId,
      costoTotal: Number(f.costoTotal),
      tarifaCobrada: f.tarifaCobrada === null ? null : Number(f.tarifaCobrada),
    })),
    kilosPorCompra: new Map(compras.map((c) => [c.id, Number(c.kilos)])),
    consumos: consumos.map((c) => ({ ventaId: c.ventaId, compraId: c.lote.compraId, kilos: Number(c.kilosConsumidos) })),
  });
}

export interface ResumenFletes {
  viajes: number;
  costoReal: number;
  ingresos: number;
  resultadoTransporte: number;
  imputadoAgricola: number;
  ingresoTerceros: number;
  sinLigar: number;
}

/**
 * Resumen del transporte en un rango de fechas. Los ingresos son la tarifa de cada viaje; si no
 * tiene tarifa, el transporte le "cobra" a la agrícola su costo real, así el resultado del
 * transporte solo refleja lo que gana o pierde por encima del costo.
 */
export async function resumirFletes(desde?: Date, hasta?: Date): Promise<ResumenFletes> {
  const fletes = await prisma.flete.findMany({ where: { fecha: { gte: desde, lte: hasta } } });
  const r: ResumenFletes = { viajes: fletes.length, costoReal: 0, ingresos: 0, resultadoTransporte: 0, imputadoAgricola: 0, ingresoTerceros: 0, sinLigar: 0 };
  for (const f of fletes) {
    const costo = Number(f.costoTotal);
    const tarifa = f.tarifaCobrada === null ? null : Number(f.tarifaCobrada);
    r.costoReal += costo;
    r.ingresos += tarifa ?? costo;
    if (f.tipo === "tercero") r.ingresoTerceros += tarifa ?? 0;
    else {
      r.imputadoAgricola += costoParaAgricola({ costoTotal: costo, tarifaCobrada: tarifa });
      if (!f.compraId && !f.ventaId) r.sinLigar++;
    }
  }
  r.resultadoTransporte = r.ingresos - r.costoReal;
  return r;
}

/**
 * "Ventas" de Transportes San Rafael SpA: fletes a terceros, que es la única
 * plata que el transporte cobra a alguien externo (lo demás es costo interno
 * imputado a la agrícola). Se muestran en /ventas junto a las ventas de fruta.
 */
export async function listarServiciosTransporte() {
  return prisma.flete.findMany({
    where: { tipo: "tercero" },
    orderBy: { fecha: "desc" },
    include: { cliente: { select: { nombre: true } } },
  });
}

export async function marcarFleteCobrado(id: string, fecha: string, usuarioId: string) {
  return prisma.$transaction(async (tx) => {
    const flete = await tx.flete.findUnique({ where: { id } });
    if (!flete) throw new NotFoundError("Flete no encontrado");
    const actualizado = await tx.flete.update({ where: { id }, data: { estadoCobro: "cobrado", fechaCobro: new Date(fecha) } });
    await registrarAuditLog(tx, {
      tabla: "fletes",
      registroId: id,
      accion: "update",
      campoAntes: { estadoCobro: flete.estadoCobro },
      campoDespues: { estadoCobro: "cobrado", fechaCobro: fecha },
      usuarioId,
    });
    return actualizado;
  });
}
