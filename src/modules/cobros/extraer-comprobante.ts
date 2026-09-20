import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { env } from "@/lib/env";
import { ValidationError } from "@/modules/shared/errors";

const comprobanteSchema = z.object({
  monto: z.number().nullable(),
  fecha: z.string().nullable(),
  hora: z.string().nullable(),
  medioPago: z
    .enum(["efectivo", "transferencia", "deposito_cajavecina", "mercadopago", "otro"])
    .nullable(),
  numeroOperacion: z.string().nullable(),
  pagadorNombre: z.string().nullable(),
  pagadorRut: z.string().nullable(),
  glosa: z.string().nullable(),
  banco: z.string().nullable(),
});

export type ComprobanteExtraido = z.infer<typeof comprobanteSchema>;

const PROMPT = `Eres un asistente que lee comprobantes de pago (fotos o capturas) que recibe un negocio agrícola chileno de palta. Los comprobantes son pagos que los CLIENTES le hacen al dueño del negocio: transferencias bancarias (Banco Falabella, Banco Estado, Santander, etc.), depósitos en efectivo en CajaVecina/BancoEstado, o pagos por Mercado Pago.

Responde ÚNICAMENTE con un objeto JSON (sin texto adicional, sin markdown, sin \`\`\`) con esta forma exacta:

{
  "monto": number o null (monto pagado en pesos chilenos, solo el número entero, ej. 140000),
  "fecha": string "YYYY-MM-DD" o null (la fecha del comprobante; las fechas chilenas vienen día/mes/año, ej. "18/09/26" es 2026-09-18),
  "hora": string "HH:MM" o null,
  "medioPago": "transferencia" o "deposito_cajavecina" o "mercadopago" o "efectivo" o "otro" o null,
  "numeroOperacion": string o null (N° de operación, N° de transacción o código de autorización; si hay varios, prefiere el N° de operación o de transacción),
  "pagadorNombre": string o null (quien HIZO el pago: en una transferencia es el "Origen"/titular de la cuenta de origen; en un depósito es quien deposita si aparece su nombre),
  "pagadorRut": string o null (RUT de quien paga; en depósitos CajaVecina aparece como "RUT DEPOSITANTE"),
  "glosa": string o null (mensaje o comentario que escribió quien paga, ej. "50 kilos paltas claudio"),
  "banco": string o null (banco o servicio del comprobante, ej. "Banco Falabella", "CajaVecina")
}

Notas importantes:
- Un depósito en efectivo hecho en CajaVecina se marca como "deposito_cajavecina".
- No confundas al pagador con el destinatario: el destinatario o "depositado a" es el dueño del negocio, no el cliente.
- Si algún dato no aparece o no se lee con claridad, usa null. No inventes datos.`;

function detectarMediaType(filename: string, contentType: string): string {
  if (contentType && contentType !== "application/octet-stream") return contentType;
  const ext = filename.toLowerCase().split(".").pop();
  if (ext === "pdf") return "application/pdf";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}

function parsearRespuesta(texto: string): ComprobanteExtraido {
  const limpio = texto
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");

  let json: unknown;
  try {
    json = JSON.parse(limpio);
  } catch {
    throw new ValidationError("No se pudo leer el comprobante (respuesta no es JSON válido)");
  }
  const parseado = comprobanteSchema.safeParse(json);
  if (!parseado.success) throw new ValidationError("No se pudo leer el comprobante (formato inesperado)");
  return parseado.data;
}

export async function extraerComprobante(
  buffer: Buffer,
  filename: string,
  contentType: string,
): Promise<ComprobanteExtraido> {
  if (!env.ANTHROPIC_API_KEY) {
    throw new ValidationError("La lectura de comprobantes no está configurada (falta ANTHROPIC_API_KEY)");
  }

  const mediaType = detectarMediaType(filename, contentType);
  if (mediaType === "image/heic" || mediaType === "image/heif") {
    throw new ValidationError("Las fotos HEIC no se pueden leer; sube la foto como JPG o PNG");
  }
  const data = buffer.toString("base64");
  const documento: Anthropic.Messages.ContentBlockParam =
    mediaType === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data } }
      : {
          type: "image",
          source: { type: "base64", media_type: mediaType as "image/jpeg" | "image/png" | "image/webp", data },
        };

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const respuesta = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 1024,
    messages: [{ role: "user", content: [documento, { type: "text", text: PROMPT }] }],
  });

  const bloque = respuesta.content.find((b) => b.type === "text");
  if (!bloque || bloque.type !== "text") throw new ValidationError("No se pudo leer la respuesta del modelo");
  return parsearRespuesta(bloque.text);
}
