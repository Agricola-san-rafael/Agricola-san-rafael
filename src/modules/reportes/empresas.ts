import { prisma } from "@/lib/prisma";
import { rangoDePeriodo, type Periodo } from "./utilidad";
import { costoParaAgricola } from "@/modules/fletes/imputacion";

export interface UtilidadEmpresas {
  agricola: {
    ventas: number;
    costoLotes: number;
    utilidadBruta: number;
    gastos: number;
    gastosPorCategoria: Record<string, number>;
    fletesImputados: number;
    utilidadNeta: number;
  };
  transporte: {
    viajes: number;
    ingresosDeLaAgricola: number;
    ingresosDeTerceros: number;
    ingresos: number;
    costoCombustible: number;
    costoChofer: number;
    costoPeajes: number;
    costoOtros: number;
    costoReal: number;
    utilidadDeViajes: number;
    gastos: number;
    gastosPorCategoria: Record<string, number>;
    utilidad: number;
  };
  consolidado: { utilidad: number };
}

const n = (x: unknown) => Number(x ?? 0);

/** Utilidad de la agrícola y de la empresa de transporte por separado, y de ambas juntas. */
export async function obtenerUtilidadPorEmpresa(periodo: Periodo): Promise<UtilidadEmpresas> {
  const { desde, hasta } = rangoDePeriodo(periodo);
  const fecha = { gte: desde, lte: hasta };

  const [ventas, gastos, fletes] = await Promise.all([
    prisma.venta.aggregate({ where: { esAjuste: false, fecha }, _sum: { total: true, costoTotal: true } }),
    prisma.gastoOperacional.findMany({ where: { fecha }, select: { categoria: true, monto: true, empresa: true } }),
    prisma.flete.findMany({ where: { fecha } }),
  ]);

  const gastosPorCategoria: Record<string, number> = {};
  const gastosTransporteCat: Record<string, number> = {};
  let gastosTotal = 0;
  let gastosTransporte = 0;
  for (const g of gastos) {
    if (g.empresa === "transporte") {
      gastosTransporteCat[g.categoria] = (gastosTransporteCat[g.categoria] ?? 0) + n(g.monto);
      gastosTransporte += n(g.monto);
    } else {
      gastosPorCategoria[g.categoria] = (gastosPorCategoria[g.categoria] ?? 0) + n(g.monto);
      gastosTotal += n(g.monto);
    }
  }

  const t = { ingresosDeLaAgricola: 0, ingresosDeTerceros: 0, costoCombustible: 0, costoChofer: 0, costoPeajes: 0, costoOtros: 0 };
  for (const f of fletes) {
    const tarifa = f.tarifaCobrada === null ? null : n(f.tarifaCobrada);
    if (f.tipo === "tercero") t.ingresosDeTerceros += tarifa ?? 0;
    else t.ingresosDeLaAgricola += costoParaAgricola({ costoTotal: n(f.costoTotal), tarifaCobrada: tarifa });
    t.costoCombustible += n(f.costoCombustible);
    t.costoChofer += n(f.costoChofer);
    t.costoPeajes += n(f.costoPeajes);
    t.costoOtros += n(f.costoOtros);
  }
  const costoReal = t.costoCombustible + t.costoChofer + t.costoPeajes + t.costoOtros;
  const ingresos = t.ingresosDeLaAgricola + t.ingresosDeTerceros;

  const ventasTotal = n(ventas._sum.total);
  const costoLotes = n(ventas._sum.costoTotal);
  const utilidadBruta = ventasTotal - costoLotes;
  const utilidadNetaAgricola = utilidadBruta - gastosTotal - t.ingresosDeLaAgricola;
  const utilidadDeViajes = ingresos - costoReal;
  const utilidadTransporte = utilidadDeViajes - gastosTransporte;

  return {
    agricola: {
      ventas: ventasTotal,
      costoLotes,
      utilidadBruta,
      gastos: gastosTotal,
      gastosPorCategoria,
      fletesImputados: t.ingresosDeLaAgricola,
      utilidadNeta: utilidadNetaAgricola,
    },
    transporte: {
      viajes: fletes.length,
      ...t,
      ingresos,
      costoReal,
      utilidadDeViajes,
      gastos: gastosTransporte,
      gastosPorCategoria: gastosTransporteCat,
      utilidad: utilidadTransporte,
    },
    consolidado: { utilidad: utilidadNetaAgricola + utilidadTransporte },
  };
}
