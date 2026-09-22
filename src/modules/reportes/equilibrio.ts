import { prisma } from "@/lib/prisma";
import { totalCostosFijosMensuales } from "@/modules/fletes/costos-fijos";

export const ES_INCOBRABLE = /condonaci[oó]n|incobrable/i;

/** Ventas necesarias al mes para cubrir los costos fijos, según el margen bruto (utilidad bruta / ventas). */
export function calcularEquilibrioVentas(costosFijos: number, margenBrutoPct: number): number | null {
  return margenBrutoPct > 0 ? costosFijos / margenBrutoPct : null;
}

export interface MesAgricola {
  mes: string;
  ventas: number;
  utilidadBruta: number;
  kilos: number;
  gastosOperacionales: number;
  incobrables: number;
}

export interface EquilibrioAgricola {
  meses: MesAgricola[];
  mesActual: MesAgricola;
  margenBrutoPct: number;
  margenPorKg: number;
  costosFijosConfigurados: number;
  costosFijosPromedioReal: number;
  costosFijosUsados: number;
  origenCostosFijos: "configurados" | "promedio real";
  ventasEquilibrio: number | null;
  kilosEquilibrio: number | null;
  incobrablesTotal: number;
  incobrablesSobreUtilidad: number;
}

const claveMes = (d: Date) => d.toISOString().slice(0, 7);

/** Punto de equilibrio de la Agrícola San Rafael con los últimos meses completos y el mes en curso. */
export async function obtenerEquilibrioAgricola(hoy: Date = new Date()): Promise<EquilibrioAgricola> {
  const inicioMesActual = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), 1));
  const desde = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() - 3, 1));

  const [ventas, gastos, configurados] = await Promise.all([
    prisma.venta.findMany({ where: { esAjuste: false, fecha: { gte: desde } }, select: { fecha: true, total: true, costoTotal: true, kilos: true } }),
    prisma.gastoOperacional.findMany({ where: { empresa: "agricola", fecha: { gte: desde } }, select: { fecha: true, monto: true, descripcion: true } }),
    totalCostosFijosMensuales("agricola"),
  ]);

  const mapa = new Map<string, MesAgricola>();
  const mes = (k: string) => mapa.get(k) ?? { mes: k, ventas: 0, utilidadBruta: 0, kilos: 0, gastosOperacionales: 0, incobrables: 0 };
  for (const v of ventas) {
    const m = mes(claveMes(v.fecha));
    m.ventas += Number(v.total);
    m.utilidadBruta += Number(v.total) - Number(v.costoTotal);
    m.kilos += Number(v.kilos);
    mapa.set(m.mes, m);
  }
  for (const g of gastos) {
    const m = mes(claveMes(g.fecha));
    if (ES_INCOBRABLE.test(g.descripcion ?? "")) m.incobrables += Number(g.monto);
    else m.gastosOperacionales += Number(g.monto);
    mapa.set(m.mes, m);
  }

  const actualKey = claveMes(inicioMesActual);
  const todos = [...mapa.values()].sort((a, b) => a.mes.localeCompare(b.mes));
  const completos = todos.filter((m) => m.mes < actualKey);
  const base = completos.length > 0 ? completos : todos;

  const sum = (campo: keyof Omit<MesAgricola, "mes">, lista: MesAgricola[]) => lista.reduce((a, m) => a + m[campo], 0);
  const ventasBase = sum("ventas", base);
  const margenBrutoPct = ventasBase > 0 ? sum("utilidadBruta", base) / ventasBase : 0;
  const kilosBase = sum("kilos", base);
  const margenPorKg = kilosBase > 0 ? sum("utilidadBruta", base) / kilosBase : 0;
  const promedioReal = base.length > 0 ? sum("gastosOperacionales", base) / base.length : 0;
  const usados = configurados > 0 ? configurados : promedioReal;
  const incobrablesTotal = sum("incobrables", todos);

  return {
    meses: todos,
    mesActual: mapa.get(actualKey) ?? { mes: actualKey, ventas: 0, utilidadBruta: 0, kilos: 0, gastosOperacionales: 0, incobrables: 0 },
    margenBrutoPct,
    margenPorKg,
    costosFijosConfigurados: configurados,
    costosFijosPromedioReal: promedioReal,
    costosFijosUsados: usados,
    origenCostosFijos: configurados > 0 ? "configurados" : "promedio real",
    ventasEquilibrio: calcularEquilibrioVentas(usados, margenBrutoPct),
    kilosEquilibrio: margenPorKg > 0 ? usados / margenPorKg : null,
    incobrablesTotal,
    incobrablesSobreUtilidad: sum("utilidadBruta", todos) > 0 ? incobrablesTotal / sum("utilidadBruta", todos) : 0,
  };
}
