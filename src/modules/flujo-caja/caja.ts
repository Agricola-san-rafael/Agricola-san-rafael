export type Caja = "efectivo" | "banco";

/**
 * En qué caja entra o de cuál sale un movimiento según con qué se pagó.
 * "Otro" (lo que quedó guardado en las ventas y compras pagadas antes de existir el
 * campo "medio de pago") se cuenta como efectivo; el arqueo corrige cualquier diferencia.
 */
export function cajaDeMedioPago(medio: string): Caja {
  return medio === "transferencia" || medio === "deposito_cajavecina" || medio === "mercadopago"
    ? "banco"
    : "efectivo";
}

export function cajaDeGasto(formaPago: string): Caja {
  return formaPago === "transferencia" ? "banco" : "efectivo";
}

/** Los arqueos son ajustes de caja cuyo motivo empieza así; así se sabe cuándo fue el último. */
export const PREFIJO_ARQUEO = "Arqueo de caja";

export interface SaldosCaja {
  efectivo: number;
  banco: number;
  total: number;
}

export function sumarSaldos(movimientos: { caja: Caja; monto: number }[]): SaldosCaja {
  let efectivo = 0;
  let banco = 0;
  for (const m of movimientos) {
    if (m.caja === "efectivo") efectivo += m.monto;
    else banco += m.monto;
  }
  return { efectivo, banco, total: efectivo + banco };
}

export function redondear2(n: number): number {
  return Math.round(n * 100) / 100;
}
