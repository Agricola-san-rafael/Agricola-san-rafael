export interface LoteParaMerma {
  id: string;
  kilosDisponibles: number;
  costoKg: number;
}

export interface MermaDeLote {
  loteId: string;
  kilos: number;
  costoKg: number;
  /** Lo dado de baja al costo del lote, en pesos enteros. */
  valor: number;
}

const aCentesimas = (kilos: number) => Math.round(kilos * 100);

/** Diferencia entre lo que dice el sistema y lo pesado, sin errores de punto flotante. */
export function diferenciaDeConteo(kilosSistema: number, kilosPesados: number): { faltan: number; sobran: number } {
  const dif = aCentesimas(kilosSistema) - aCentesimas(kilosPesados);
  return { faltan: dif > 0 ? dif / 100 : 0, sobran: dif < 0 ? -dif / 100 : 0 };
}

/**
 * Reparte los kilos que faltan entre los lotes de un calibre, en proporción a lo que tiene cada uno
 * (la pérdida de peso afecta a todos por igual). Trabaja en centésimas de kilo y entrega los restos
 * a los lotes con mayor fracción, para que la suma sea exactamente la merma.
 */
export function repartirMerma(lotes: LoteParaMerma[], kilosMerma: number): MermaDeLote[] {
  const merma = aCentesimas(kilosMerma);
  if (merma <= 0) return [];

  const disponibles = lotes.map((l) => ({ lote: l, centesimas: aCentesimas(l.kilosDisponibles) })).filter((l) => l.centesimas > 0);
  const total = disponibles.reduce((a, l) => a + l.centesimas, 0);
  if (merma > total) throw new Error("La merma es mayor que el stock de los lotes");

  const partes = disponibles.map((l) => {
    const exacto = (merma * l.centesimas) / total;
    const base = Math.floor(exacto);
    return { ...l, base, fraccion: exacto - base };
  });
  let resto = merma - partes.reduce((a, p) => a + p.base, 0);
  for (const p of [...partes].sort((a, b) => b.fraccion - a.fraccion)) {
    if (resto <= 0) break;
    if (p.base < p.centesimas) {
      p.base += 1;
      resto -= 1;
    }
  }

  return partes
    .filter((p) => p.base > 0)
    .map((p) => ({
      loteId: p.lote.id,
      kilos: p.base / 100,
      costoKg: p.lote.costoKg,
      valor: Math.round((p.base * p.lote.costoKg) / 100),
    }));
}

/** Porcentaje de `parte` sobre `total` (0 si no hay base). */
export function porcentaje(parte: number, total: number): number {
  return total > 0 ? (parte / total) * 100 : 0;
}
