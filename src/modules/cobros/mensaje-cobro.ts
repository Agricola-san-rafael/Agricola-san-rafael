import { formatDateCL } from "@/modules/shared/dates";
import { formatCLP } from "@/modules/shared/money";

export interface LineaDeuda {
  fecha: Date;
  detalle: string;
  pendiente: number;
  total: number;
}

export function armarMensajeCobro(nombre: string, lineas: LineaDeuda[], saldo: number): string {
  const detalle = lineas
    .map((l) => {
      const resto = l.pendiente < l.total ? " (saldo)" : "";
      return `• ${formatDateCL(l.fecha)} – ${l.detalle}: ${formatCLP(l.pendiente)}${resto}`;
    })
    .join("\n");

  return [
    `Hola ${nombre}, te escribo de Agrícola San Rafael.`,
    "",
    "Te recuerdo que tienes un saldo pendiente:",
    detalle,
    "",
    `Total a pagar: ${formatCLP(saldo)}`,
    "",
    "Cuando hagas el pago, por favor avísame y mándame el comprobante. ¡Gracias!",
  ].join("\n");
}

/** Deja el teléfono como solo dígitos con código de país (Chile), o null si no se puede usar. */
export function normalizarTelefonoWhatsApp(telefono: string | null): string | null {
  if (!telefono) return null;
  const digitos = telefono.replace(/\D/g, "");
  if (digitos.startsWith("56") && digitos.length === 11) return digitos;
  if (digitos.length === 9) return `56${digitos}`;
  if (digitos.length === 8) return `569${digitos}`;
  return null;
}

export function urlWhatsApp(telefono: string | null, mensaje: string): string | null {
  const numero = normalizarTelefonoWhatsApp(telefono);
  if (!numero) return null;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}
