/** Avisa el día en que la deuda más antigua cruza el umbral y luego cada 7 días, sin repetir todos los días. */
export function debeAvisarAtraso(diasDeuda: number, umbral: number): boolean {
  if (diasDeuda <= umbral) return false;
  return (diasDeuda - umbral - 1) % 7 === 0;
}
