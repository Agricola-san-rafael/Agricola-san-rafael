import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { ConflictError, NotFoundError, ValidationError } from "@/modules/shared/errors";
import { registrarAuditLog } from "@/modules/shared/audit";
import { rangoDelMes } from "@/modules/reportes/cierre-mensual";
import { diferenciaDiasUTC } from "@/modules/shared/dates";
import { CAUSAS_MERMA, ETIQUETA_CAUSA, type CausaMermaValor } from "./causas";
import { diferenciaDeConteo, porcentaje, repartirMerma } from "./calculo";
import type { ConteoInput } from "./schema";

interface LoteRow {
  id: string;
  sku: string;
  kilos_disponibles: string;
  costo_kg: string;
}

const kg = (n: number) => String(n).replace(".", ",");

export interface FilaConteo {
  variedadId: string;
  calibreId: string;
  etiqueta: string;
  kilosSistema: number;
  /** Costo por kilo de lo que hay en bodega, ponderado por kilos: sirve para valorizar la diferencia antes de guardarla. */
  costoPromedio: number;
  lotes: number;
}

/** Lo que hay en bodega por variedad y calibre: la lista que se pesa al contar. */
export async function obtenerStockParaConteo(): Promise<FilaConteo[]> {
  const lotes = await prisma.loteInventario.findMany({
    where: { kilosDisponibles: { gt: 0 } },
    include: { variedad: true, calibre: true },
  });
  const grupos = new Map<string, { fila: FilaConteo; valor: number; orden: number }>();
  for (const l of lotes) {
    const clave = `${l.variedadId}|${l.calibreId}`;
    const grupo = grupos.get(clave) ?? {
      fila: { variedadId: l.variedadId, calibreId: l.calibreId, etiqueta: `${l.variedad.nombre} — ${l.calibre.codigo}`, kilosSistema: 0, costoPromedio: 0, lotes: 0 },
      valor: 0,
      orden: l.calibre.orden,
    };
    const kilos = Number(l.kilosDisponibles);
    grupo.fila.kilosSistema += kilos;
    grupo.fila.lotes += 1;
    grupo.valor += kilos * Number(l.costoKg);
    grupos.set(clave, grupo);
  }
  return [...grupos.values()]
    .map(({ fila, valor, orden }) => ({
      orden,
      fila: { ...fila, kilosSistema: Math.round(fila.kilosSistema * 100) / 100, costoPromedio: fila.kilosSistema > 0 ? valor / fila.kilosSistema : 0 },
    }))
    .sort((a, b) => a.fila.etiqueta.split(" — ")[0].localeCompare(b.fila.etiqueta.split(" — ")[0]) || a.orden - b.orden)
    .map((x) => x.fila);
}

export interface ResultadoConteo {
  fecha: string;
  filas: { etiqueta: string; causa: CausaMermaValor; kilos: number; valor: number }[];
  totalKilos: number;
  totalValor: number;
}

/**
 * Registra el conteo: por cada calibre cuyo peso es menor que el del sistema, da de baja la diferencia
 * repartida entre sus lotes y la guarda como merma con su causa. La plata no se mueve: se anota el gasto
 * contable de la pérdida y su contrapartida en la caja de efectivo, como las demás pérdidas de inventario.
 * Todo ocurre en una sola transacción: o se guarda todo o nada.
 */
export async function registrarConteo(input: ConteoInput, usuarioId: string): Promise<ResultadoConteo> {
  return prisma.$transaction(
    async (tx) => {
      const filas: ResultadoConteo["filas"] = [];

      for (const c of input.conteos) {
        const [calibre, variedad] = await Promise.all([
          tx.calibre.findUnique({ where: { id: c.calibreId } }),
          tx.variedad.findUnique({ where: { id: c.variedadId } }),
        ]);
        if (!calibre || !variedad) throw new NotFoundError("Variedad o calibre no encontrado");
        const etiqueta = `${variedad.nombre} ${calibre.codigo}`;

        const lotes = await tx.$queryRaw<LoteRow[]>`
          SELECT id, sku, kilos_disponibles, costo_kg FROM lotes_inventario
          WHERE variedad_id = ${c.variedadId} AND calibre_id = ${c.calibreId} AND kilos_disponibles > 0
          ORDER BY fecha_ingreso, sku
          FOR UPDATE
        `;
        const kilosSistema = lotes.reduce((a, l) => a + Number(l.kilos_disponibles), 0);
        if (Math.abs(kilosSistema - c.kilosSistema) > 0.005) {
          throw new ConflictError(`El stock de ${etiqueta} cambió mientras contabas (ahora el sistema tiene ${kg(Math.round(kilosSistema * 100) / 100)} kg). Recarga la página y vuelve a contar.`);
        }

        const { faltan, sobran } = diferenciaDeConteo(kilosSistema, c.kilosPesados);
        if (sobran > 0) {
          throw new ValidationError(`En ${etiqueta} pesaste ${kg(sobran)} kg más de lo que dice el sistema. Revisa el conteo o corrige el lote con "Ajustar" en Lotes.`);
        }
        if (faltan === 0) continue;

        const partes = repartirMerma(
          lotes.map((l) => ({ id: l.id, kilosDisponibles: Number(l.kilos_disponibles), costoKg: Number(l.costo_kg) })),
          faltan,
        );
        const skuPorId = new Map(lotes.map((l) => [l.id, l]));
        const motivo = `Merma (${ETIQUETA_CAUSA[c.causa]}) al pesar el stock de ${etiqueta}: pesados ${kg(c.kilosPesados)} kg, el sistema decía ${kg(kilosSistema)} kg`;

        for (const p of partes) {
          const lote = skuPorId.get(p.loteId)!;
          const antes = new Prisma.Decimal(lote.kilos_disponibles);
          const despues = antes.sub(new Prisma.Decimal(p.kilos));
          await tx.loteInventario.update({
            where: { id: p.loteId },
            data: { kilosDisponibles: despues, estado: despues.lte(0) ? "agotado" : "disponible" },
          });
          const merma = await tx.merma.create({
            data: {
              fecha: new Date(input.fecha),
              loteId: p.loteId,
              kilos: new Prisma.Decimal(p.kilos),
              costoKg: new Prisma.Decimal(p.costoKg),
              valor: new Prisma.Decimal(p.valor),
              causa: c.causa,
              observaciones: c.observaciones || undefined,
              createdById: usuarioId,
            },
          });
          await registrarAuditLog(tx, {
            tabla: "lotes_inventario",
            registroId: p.loteId,
            accion: "update",
            campoAntes: { kilosDisponibles: antes.toNumber() },
            campoDespues: { kilosDisponibles: despues.toNumber(), motivo, mermaId: merma.id },
            usuarioId,
          });
        }

        const kilos = partes.reduce((a, p) => a + p.kilos, 0);
        const valor = partes.reduce((a, p) => a + p.valor, 0);
        const detalleLotes = partes.map((p) => `${skuPorId.get(p.loteId)!.sku} ${kg(p.kilos)} kg`).join(", ");
        const descripcion = `Pérdida de inventario por merma (${ETIQUETA_CAUSA[c.causa].toLowerCase()}): ${kg(Math.round(kilos * 100) / 100)} kg de ${etiqueta} (${detalleLotes}) dados de baja al pesar el stock el ${input.fecha} (no es salida de plata)`;

        const gasto = await tx.gastoOperacional.create({
          data: { fecha: new Date(input.fecha), categoria: "otro", descripcion, monto: new Prisma.Decimal(valor), formaPago: "efectivo", estadoPago: "pagado", empresa: "agricola", createdById: usuarioId },
        });
        await registrarAuditLog(tx, { tabla: "gastos_operacionales", registroId: gasto.id, accion: "create", campoDespues: { monto: valor, categoria: "otro" }, usuarioId });
        const ajuste = await tx.ajusteCaja.create({
          data: { fecha: new Date(input.fecha), monto: new Prisma.Decimal(valor), motivo: `Contrapartida de la merma de inventario del ${input.fecha} (no entró ni salió plata; cancela el gasto contable)`, caja: "efectivo", createdById: usuarioId },
        });
        await registrarAuditLog(tx, { tabla: "ajustes_caja", registroId: ajuste.id, accion: "create", campoDespues: { monto: valor, caja: "efectivo" }, usuarioId });

        filas.push({ etiqueta, causa: c.causa, kilos: Math.round(kilos * 100) / 100, valor });
      }

      if (filas.length === 0) throw new ValidationError("Lo pesado coincide con el sistema: no hay merma que registrar");
      return {
        fecha: input.fecha,
        filas,
        totalKilos: Math.round(filas.reduce((a, f) => a + f.kilos, 0) * 100) / 100,
        totalValor: filas.reduce((a, f) => a + f.valor, 0),
      };
    },
    { timeout: 30_000 },
  );
}

export interface ResumenMesMerma {
  mes: string;
  kilosComprados: number;
  kilosMerma: number;
  valorMerma: number;
  /** Merma sobre los kilos comprados en el mes. */
  porcentaje: number;
  kilosPorCausa: Record<CausaMermaValor, number>;
}

const n = (x: unknown) => Number(x ?? 0);

/** Los últimos `cantidad` meses (el actual primero): kilos comprados, merma y su porcentaje. */
export async function obtenerResumenMermas(cantidad = 3, hoy: Date = new Date()): Promise<ResumenMesMerma[]> {
  const meses: string[] = [];
  for (let i = 0; i < cantidad; i++) {
    const d = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() - i, 1));
    meses.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }

  return Promise.all(
    meses.map(async (mes) => {
      const { desde, hasta } = rangoDelMes(mes);
      const fecha = { gte: desde, lte: hasta };
      const [compras, mermas] = await Promise.all([
        prisma.compra.aggregate({ where: { fecha }, _sum: { kilos: true } }),
        prisma.merma.groupBy({ by: ["causa"], where: { fecha }, _sum: { kilos: true, valor: true } }),
      ]);
      const kilosPorCausa = Object.fromEntries(CAUSAS_MERMA.map((c) => [c, 0])) as Record<CausaMermaValor, number>;
      let kilosMerma = 0;
      let valorMerma = 0;
      for (const m of mermas) {
        kilosPorCausa[m.causa] = n(m._sum.kilos);
        kilosMerma += n(m._sum.kilos);
        valorMerma += n(m._sum.valor);
      }
      const kilosComprados = n(compras._sum.kilos);
      return { mes, kilosComprados, kilosMerma, valorMerma, porcentaje: porcentaje(kilosMerma, kilosComprados), kilosPorCausa };
    }),
  );
}

export interface MermaPorLote {
  loteId: string;
  sku: string;
  calibre: string;
  proveedor: string;
  fechaIngreso: Date;
  diasEnBodega: number;
  kilosIniciales: number;
  kilosMerma: number;
  valorMerma: number;
  /** Merma sobre los kilos con que entró el lote. */
  porcentaje: number;
}

/** Los lotes con más merma (en porcentaje de lo que entró), con los días que llevan en bodega. */
export async function obtenerMermasPorLote(limite = 12, hoy: Date = new Date()): Promise<MermaPorLote[]> {
  const grupos = await prisma.merma.groupBy({ by: ["loteId"], _sum: { kilos: true, valor: true } });
  if (grupos.length === 0) return [];
  const lotes = await prisma.loteInventario.findMany({
    where: { id: { in: grupos.map((g) => g.loteId) } },
    include: { calibre: true, compra: { include: { proveedor: true } } },
  });
  const porId = new Map(lotes.map((l) => [l.id, l]));
  return grupos
    .map((g) => {
      const l = porId.get(g.loteId)!;
      const kilosIniciales = Number(l.kilosIniciales);
      const kilosMerma = n(g._sum.kilos);
      return {
        loteId: g.loteId,
        sku: l.sku,
        calibre: l.calibre.codigo,
        proveedor: l.compra.proveedor.nombre,
        fechaIngreso: l.fechaIngreso,
        diasEnBodega: diferenciaDiasUTC(hoy, l.fechaIngreso),
        kilosIniciales,
        kilosMerma,
        valorMerma: n(g._sum.valor),
        porcentaje: porcentaje(kilosMerma, kilosIniciales),
      };
    })
    .sort((a, b) => b.porcentaje - a.porcentaje)
    .slice(0, limite);
}

/** Los últimos registros de merma, para ver qué se dio de baja y por qué. */
export async function listarUltimasMermas(limite = 15) {
  const filas = await prisma.merma.findMany({
    orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
    take: limite,
    include: { lote: { include: { calibre: true } } },
  });
  return filas.map((m) => ({
    id: m.id,
    fecha: m.fecha,
    sku: m.lote.sku,
    calibre: m.lote.calibre.codigo,
    kilos: Number(m.kilos),
    valor: Number(m.valor),
    causa: m.causa as CausaMermaValor,
    observaciones: m.observaciones,
  }));
}
