export const VENTANA_MINUTOS = 15;
export const MAX_FALLOS_POR_EMAIL = 5;
export const MAX_FALLOS_POR_IP = 30;

/** Decide si un login debe bloquearse según los intentos fallidos recientes de ese correo y de esa IP. */
export function debeBloquearLogin(fallosDelEmail: number, fallosDeLaIp: number): boolean {
  return fallosDelEmail >= MAX_FALLOS_POR_EMAIL || fallosDeLaIp >= MAX_FALLOS_POR_IP;
}
