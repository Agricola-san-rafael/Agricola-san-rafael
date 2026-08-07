/** Normaliza texto libre del Excel a los enums de Postgres (case-insensitive, con default). */

function normalizar(valor: string | undefined): string {
  return (valor ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, ""); // quita tildes
}

/**
 * En el Excel real la columna "Forma de Pago" mezcla términos de pago
 * ("Crédito", "Crédito 3 días") con métodos de pago ("Depósito y
 * Transferencia") de forma inconsistente — por eso .includes() en vez de
 * igualdad exacta, y por eso el fallback: si el texto no menciona
 * "crédito" pero el estado de pago es pendiente/parcial, es casi seguro
 * una venta/compra a crédito (nadie deja "pendiente" algo pagado al
 * contado). Sin este fallback varias ventas quedarían mal clasificadas
 * como "contado" y no generarían alertas de vencimiento.
 */
export function normalizarCondicionPago(
  valor: string | undefined,
  estadoPagoHint?: "pagado" | "pendiente" | "parcial"
): "contado" | "credito" {
  const v = normalizar(valor);
  if (v.includes("credito")) return "credito";
  if (estadoPagoHint === "pendiente" || estadoPagoHint === "parcial") return "credito";
  return "contado";
}

export function normalizarEstadoPago(valor: string | undefined): "pagado" | "pendiente" | "parcial" {
  const v = normalizar(valor);
  if (v === "pendiente") return "pendiente";
  if (v === "parcial") return "parcial";
  return "pagado";
}

export function normalizarMedioPago(
  valor: string | undefined
): "efectivo" | "transferencia" | "deposito_cajavecina" | "mercadopago" | "otro" {
  const v = normalizar(valor);
  if (v.includes("transfer")) return "transferencia";
  if (v.includes("cajavecina") || v.includes("caja vecina")) return "deposito_cajavecina";
  if (v.includes("mercadopago") || v.includes("mercado pago")) return "mercadopago";
  if (v.includes("efectivo")) return "efectivo";
  return "otro";
}

export function normalizarTipoDocumento(
  valor: string | undefined
): "boleta" | "factura" | "sin_documento" {
  const v = normalizar(valor);
  if (v.includes("factura")) return "factura";
  if (v.includes("boleta")) return "boleta";
  return "sin_documento";
}

export function normalizarCategoriaGasto(
  valor: string | undefined
): "combustible" | "flete" | "mano_obra" | "embalaje" | "servicios" | "otro" {
  const v = normalizar(valor);
  if (v.includes("combustible") || v.includes("bencina") || v.includes("petroleo")) return "combustible";
  if (v.includes("flete")) return "flete";
  if (v.includes("mano de obra") || v.includes("mano obra")) return "mano_obra";
  if (v.includes("embalaje")) return "embalaje";
  if (v.includes("servicio")) return "servicios";
  return "otro";
}
