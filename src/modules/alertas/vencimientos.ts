export type AvisoVencimiento =
  | { tipo: "anticipo"; dias: number }
  | { tipo: "hoy" }
  | { tipo: "atraso"; diasAtraso: number };

/**
 * Cuándo avisar de una factura según los días que faltan para su vencimiento:
 * una vez con `anticipacion` días de aviso, el día que vence y, si sigue sin pagarse,
 * el primer día de atraso y luego cada `cadaDiasAtraso` días hasta que se pague.
 */
export function avisoVencimiento(
  diasParaVencer: number,
  anticipacion: number,
  cadaDiasAtraso = 3,
): AvisoVencimiento | null {
  if (diasParaVencer > 0) {
    return anticipacion > 0 && diasParaVencer === anticipacion ? { tipo: "anticipo", dias: diasParaVencer } : null;
  }
  if (diasParaVencer === 0) return { tipo: "hoy" };
  const diasAtraso = -diasParaVencer;
  return (diasAtraso - 1) % cadaDiasAtraso === 0 ? { tipo: "atraso", diasAtraso } : null;
}
