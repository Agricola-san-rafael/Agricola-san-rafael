import type { Prisma } from "@/generated/prisma/client";
import { normalizarTexto } from "./sugerir-cliente";

type Db = Prisma.TransactionClient;

const BANCOS: [string, string][] = [
  ["mercado pago", "mercadopago"],
  ["mercadopago", "mercadopago"],
  ["cuentarut", "estado"],
  ["banco estado", "estado"],
  ["bancoestado", "estado"],
  ["banco del estado", "estado"],
  ["banco de chile", "chile"],
  ["edwards", "chile"],
  ["santander", "santander"],
  ["bci", "bci"],
  ["falabella", "falabella"],
  ["itau", "itau"],
  ["scotiabank", "scotiabank"],
  ["bice", "bice"],
  ["security", "security"],
  ["tenpo", "tenpo"],
];

/** Banco en minúsculas y sin acentos ("BancoEstado" -> "estado"); vacío si no se reconoce. */
export function normalizarBanco(texto: string | null | undefined): string {
  if (!texto) return "";
  const t = normalizarTexto(texto);
  for (const [clave, banco] of BANCOS) {
    if (t.includes(clave)) return banco;
  }
  return t.replace(/^banco\s+/, "").split(" ")[0] ?? "";
}

/** Últimos 4 dígitos de la cuenta, que es lo único que muestran todos los comprobantes; null si no hay al menos 4 dígitos. */
export function terminacionDeCuenta(cuenta: string | null | undefined): string | null {
  if (!cuenta) return null;
  const digitos = cuenta.replace(/\D/g, "");
  return digitos.length >= 4 ? digitos.slice(-4) : null;
}

export interface ClaveCuenta {
  banco: string;
  terminacion: string;
}

export function claveCuentaOrigen(
  cuenta: string | null | undefined,
  banco: string | null | undefined,
): ClaveCuenta | null {
  const terminacion = terminacionDeCuenta(cuenta);
  if (!terminacion) return null;
  return { banco: normalizarBanco(banco), terminacion };
}

/** El cliente dueño de la cuenta de origen, solo si hay exactamente uno (con el mismo banco, o sin banco anotado). */
export async function buscarClientePorCuenta(
  db: Db,
  cuenta: string | null | undefined,
  banco: string | null | undefined,
): Promise<string | null> {
  const clave = claveCuentaOrigen(cuenta, banco);
  if (!clave) return null;
  const encontradas = await db.cuentaOrigenCliente.findMany({
    where: {
      terminacion: clave.terminacion,
      ...(clave.banco ? { banco: { in: [clave.banco, ""] } } : {}),
    },
    select: { clienteId: true },
  });
  const clientes = new Set(encontradas.map((c) => c.clienteId));
  return clientes.size === 1 ? [...clientes][0] : null;
}

/**
 * Guarda la cuenta de origen de un pago confirmado para reconocer a este cliente la próxima vez.
 * Si la cuenta ya pertenece a otro cliente no se le quita: la corrección se hace a mano en su ficha.
 */
export async function aprenderCuentaOrigen(
  db: Db,
  clienteId: string,
  cuenta: string,
  banco: string | null | undefined,
  usuarioId: string,
): Promise<"creada" | "ya_existia" | "de_otro_cliente" | "sin_datos"> {
  const clave = claveCuentaOrigen(cuenta, banco);
  if (!clave) return "sin_datos";

  const existente = await db.cuentaOrigenCliente.findUnique({
    where: { banco_terminacion: { banco: clave.banco, terminacion: clave.terminacion } },
  });
  if (existente) return existente.clienteId === clienteId ? "ya_existia" : "de_otro_cliente";

  await db.cuentaOrigenCliente.create({
    data: {
      clienteId,
      banco: clave.banco,
      terminacion: clave.terminacion,
      descripcion: [banco, cuenta].filter(Boolean).join(" · ").slice(0, 120),
      createdById: usuarioId,
    },
  });
  return "creada";
}
