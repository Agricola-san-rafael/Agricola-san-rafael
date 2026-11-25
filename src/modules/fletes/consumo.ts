/**
 * Sugerencia de costo de combustible o tarifa a cobrar a partir de los km
 * recorridos y una tarifa fija por km (configurada en Parámetros del transporte).
 * Es solo una sugerencia editable: el costo/tarifa real del viaje puede variar.
 */
export function calcularSugeridoPorKm(km: number | undefined, tarifaPorKm: number): number {
  if (!km || km <= 0 || !tarifaPorKm || tarifaPorKm <= 0) return 0;
  return Math.round(km * tarifaPorKm);
}

export interface PeajesEstimados {
  cantidad: number;
  costo: number;
}

/**
 * Estimación de peajes de un viaje a partir de los km recorridos (ida y vuelta):
 * se cuenta un peaje cada `kmPorPeaje` km y cada uno cuesta `costoPorPeaje`.
 * La cantidad se redondea al peaje más cercano. Es solo una sugerencia editable:
 * los peajes reales dependen de la ruta. Devuelve 0 si falta el km o si los
 * parámetros no están configurados.
 */
export function calcularPeajesPorKm(
  km: number | undefined,
  kmPorPeaje: number,
  costoPorPeaje: number,
): PeajesEstimados {
  if (!km || km <= 0 || !kmPorPeaje || kmPorPeaje <= 0 || !costoPorPeaje || costoPorPeaje <= 0) {
    return { cantidad: 0, costo: 0 };
  }
  const cantidad = Math.round(km / kmPorPeaje);
  return { cantidad, costo: Math.round(cantidad * costoPorPeaje) };
}
