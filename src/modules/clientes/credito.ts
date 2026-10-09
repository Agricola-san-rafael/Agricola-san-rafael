export interface EntradaCredito {
  /** Lo que el cliente debe hoy. */
  saldo: number;
  /** Tope de deuda acordado con el cliente; null si no tiene. */
  limite: number | null;
  /** Monto de la venta que se está por registrar a crédito (0 si solo se consulta). */
  ventaNueva: number;
  /** Días que lleva la deuda más antigua sin pagarse. */
  diasDeudaMasAntigua: number;
  /** Plazo en que el cliente debe pagar. */
  plazoDias: number;
}

export interface EvaluacionCredito {
  /** Lo que quedaría debiendo si se registra la venta. */
  saldoConVenta: number;
  sobreLimite: boolean;
  /** Cuánto pasa del límite (0 si no lo pasa o no hay límite). */
  exceso: number;
  /** Tiene deuda más antigua que su plazo de pago. */
  vencida: boolean;
  diasAtraso: number;
}

export function evaluarCredito(e: EntradaCredito): EvaluacionCredito {
  const saldoConVenta = e.saldo + e.ventaNueva;
  const exceso = e.limite !== null && saldoConVenta > e.limite ? saldoConVenta - e.limite : 0;
  const diasAtraso = e.saldo > 0 ? Math.max(0, e.diasDeudaMasAntigua - e.plazoDias) : 0;
  return { saldoConVenta, sobreLimite: exceso > 0, exceso, vencida: diasAtraso > 0, diasAtraso };
}
