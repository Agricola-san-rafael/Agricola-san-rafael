import { prisma } from "@/lib/prisma";

export interface FilaUtilidad {
  clave: string;
  nombre: string;
  kilos: number;
  ventas: number;
  costo: number;
  margen: number;
  margenPct: number;
}

export interface ResumenUtilidad {
  porCliente: FilaUtilidad[];
  porCalibre: FilaUtilidad[];
  total: { kilos: number; ventas: number; costo: number; margen: number; margenPct: number };
}

export type Periodo = "mes" | "anterior" | "todo";

export function rangoDePeriodo(periodo: Periodo, hoy: Date = new Date()): { desde?: Date; hasta?: Date } {
  const anio = hoy.getUTCFullYear();
  const mes = hoy.getUTCMonth();
  if (periodo === "mes") return { desde: new Date(Date.UTC(anio, mes, 1)) };
  if (periodo === "anterior") {
    return { desde: new Date(Date.UTC(anio, mes - 1, 1)), hasta: new Date(Date.UTC(anio, mes, 0)) };
  }
  return {};
}

function acumular(mapa: Map<string, FilaUtilidad>, clave: string, nombre: string, v: { kilos: number; total: number; costo: number }) {
  const fila = mapa.get(clave) ?? { clave, nombre, kilos: 0, ventas: 0, costo: 0, margen: 0, margenPct: 0 };
  fila.kilos += v.kilos;
  fila.ventas += v.total;
  fila.costo += v.costo;
  fila.margen += v.total - v.costo;
  mapa.set(clave, fila);
}

function cerrar(mapa: Map<string, FilaUtilidad>): FilaUtilidad[] {
  return [...mapa.values()]
    .map((f) => ({ ...f, margenPct: f.ventas > 0 ? f.margen / f.ventas : 0 }))
    .sort((a, b) => b.margen - a.margen);
}

/** Utilidad real (venta menos costo del lote) por cliente y por calibre. No incluye los ajustes de saldo. */
export async function obtenerUtilidad(periodo: Periodo): Promise<ResumenUtilidad> {
  const { desde, hasta } = rangoDePeriodo(periodo);
  const ventas = await prisma.venta.findMany({
    where: { esAjuste: false, kilos: { gt: 0 }, fecha: { gte: desde, lte: hasta } },
    select: {
      kilos: true,
      total: true,
      costoTotal: true,
      clienteId: true,
      cliente: { select: { nombre: true } },
      variedad: { select: { nombre: true } },
      calibre: { select: { codigo: true } },
    },
  });

  const porCliente = new Map<string, FilaUtilidad>();
  const porCalibre = new Map<string, FilaUtilidad>();
  let kilos = 0, totalVentas = 0, costo = 0;
  for (const v of ventas) {
    const d = { kilos: Number(v.kilos), total: Number(v.total), costo: Number(v.costoTotal) };
    acumular(porCliente, v.clienteId, v.cliente.nombre, d);
    const producto = `${v.variedad.nombre} ${v.calibre.codigo}`;
    acumular(porCalibre, producto, producto, d);
    kilos += d.kilos; totalVentas += d.total; costo += d.costo;
  }
  const margen = totalVentas - costo;
  return {
    porCliente: cerrar(porCliente),
    porCalibre: cerrar(porCalibre),
    total: { kilos, ventas: totalVentas, costo, margen, margenPct: totalVentas > 0 ? margen / totalVentas : 0 },
  };
}
