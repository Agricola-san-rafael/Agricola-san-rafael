export interface ViajeRentabilidad {
  origen: string | null;
  destino: string | null;
  cliente: string | null;
  km: number | null;
  ingresos: number;
  costo: number;
}

export interface FilaRentabilidad {
  nombre: string;
  viajes: number;
  km: number;
  ingresos: number;
  costo: number;
  utilidad: number;
  utilidadPorKm: number | null;
}

/**
 * Punto de equilibrio en viajes: cuántos viajes hacen falta al mes para cubrir los costos fijos,
 * según lo que deja en promedio cada viaje después de sus costos directos.
 */
export function calcularPuntoEquilibrio(p: { costosFijosMensuales: number; viajes: number; ingresos: number; costoDirecto: number }) {
  const margenPorViaje = p.viajes > 0 ? (p.ingresos - p.costoDirecto) / p.viajes : null;
  const viajesEquilibrio = margenPorViaje && margenPorViaje > 0 ? Math.ceil(p.costosFijosMensuales / margenPorViaje) : null;
  const progreso = viajesEquilibrio ? Math.min(1, p.viajes / viajesEquilibrio) : 0;
  return { margenPorViaje, viajesEquilibrio, progreso, faltan: viajesEquilibrio ? Math.max(0, viajesEquilibrio - p.viajes) : null };
}

function agrupar(viajes: ViajeRentabilidad[], clave: (v: ViajeRentabilidad) => string): FilaRentabilidad[] {
  const mapa = new Map<string, FilaRentabilidad>();
  for (const v of viajes) {
    const nombre = clave(v);
    const f = mapa.get(nombre) ?? { nombre, viajes: 0, km: 0, ingresos: 0, costo: 0, utilidad: 0, utilidadPorKm: null };
    f.viajes += 1;
    f.km += v.km ?? 0;
    f.ingresos += v.ingresos;
    f.costo += v.costo;
    f.utilidad += v.ingresos - v.costo;
    mapa.set(nombre, f);
  }
  return [...mapa.values()]
    .map((f) => ({ ...f, utilidadPorKm: f.km > 0 ? f.utilidad / f.km : null }))
    .sort((a, b) => b.utilidad - a.utilidad);
}

export const porRuta = (v: ViajeRentabilidad[]) =>
  agrupar(v, (x) => [x.origen, x.destino].filter(Boolean).join(" → ") || "Sin ruta");
export const porCliente = (v: ViajeRentabilidad[]) => agrupar(v, (x) => x.cliente ?? "Sin cliente");
