import type { ComprobanteExtraido } from "./extraer-comprobante";

const ETIQUETA_MEDIO: Record<string, string> = {
  transferencia: "Transferencia",
  deposito_cajavecina: "Depósito CajaVecina",
  mercadopago: "Mercado Pago",
  efectivo: "Efectivo",
  otro: "Pago",
};

/** Arma la referencia del cobro con los datos que sirven para reconocerlo después (N° de operación, glosa, depositante). */
export function armarReferencia(c: ComprobanteExtraido): string {
  const partes = [
    [ETIQUETA_MEDIO[c.medioPago ?? "otro"], c.banco && c.medioPago !== "deposito_cajavecina" ? c.banco : null, c.hora]
      .filter(Boolean)
      .join(" "),
    c.numeroOperacion ? `N° operación ${c.numeroOperacion}` : null,
    c.glosa ? `glosa: ${c.glosa}` : null,
    c.pagadorNombre ? `pagador: ${c.pagadorNombre}` : null,
    c.pagadorRut ? `RUT ${c.pagadorRut}` : null,
  ];
  return partes.filter(Boolean).join(", ");
}
