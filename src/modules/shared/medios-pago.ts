export const MEDIOS_PAGO = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "deposito_cajavecina", label: "Depósito CajaVecina" },
  { value: "mercadopago", label: "Mercado Pago" },
  { value: "otro", label: "Otro" },
] as const;

export type MedioPagoValor = (typeof MEDIOS_PAGO)[number]["value"];
