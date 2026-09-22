/**
 * Sugerencia de costo de combustible o tarifa a cobrar a partir de los km
 * recorridos y una tarifa fija por km (configurada en Parámetros del transporte).
 * Es solo una sugerencia editable: el costo/tarifa real del viaje puede variar.
 */
export function calcularSugeridoPorKm(km: number | undefined, tarifaPorKm: number): number {
  if (!km || km <= 0 || !tarifaPorKm || tarifaPorKm <= 0) return 0;
  return Math.round(km * tarifaPorKm);
}
