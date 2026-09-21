import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { env } from "@/lib/env";
import { ValidationError } from "@/modules/shared/errors";

const gastoExtraidoSchema = z.object({
  monto: z.number().nullable(),
  fecha: z.string().nullable(),
  categoria: z.enum(["combustible", "flete", "mano_obra", "embalaje", "servicios", "otro"]).nullable(),
  descripcion: z.string().nullable(),
  pagadoA: z.string().nullable(),
  formaPago: z.enum(["efectivo", "transferencia", "otro"]).nullable(),
  numeroDocumento: z.string().nullable(),
});

export type GastoExtraido = z.infer<typeof gastoExtraidoSchema>;

const PROMPT = `Eres un asistente que lee boletas, facturas y comprobantes de gastos de un negocio agrícola chileno que compra y vende palta. Son gastos del negocio como combustible, fletes, mano de obra, cajas y embalaje, y servicios (luz, agua, internet, teléfono, contabilidad).

Responde ÚNICAMENTE con un objeto JSON (sin texto adicional, sin markdown, sin \`\`\`) con esta forma exacta:

{
  "monto": number o null (total pagado en pesos chilenos, solo el número entero),
  "fecha": string "YYYY-MM-DD" o null (fechas chilenas: día/mes/año),
  "categoria": "combustible" o "flete" o "mano_obra" o "embalaje" o "servicios" o "otro" o null,
  "descripcion": string o null (qué se compró o pagó, breve),
  "pagadoA": string o null (comercio, proveedor o persona a quien se le pagó),
  "formaPago": "efectivo" o "transferencia" o "otro" o null (si es una transferencia bancaria, "transferencia"; si dice efectivo, "efectivo"),
  "numeroDocumento": string o null (número de boleta, factura u operación)
}

Notas importantes:
- monto es el TOTAL final que se pagó, con IVA incluido.
- Elige la categoría según lo que se pagó; si no calza con ninguna, usa "otro".
- Si algún dato no aparece o no se lee con claridad, usa null. No inventes datos.`;

function detectarMediaType(filename: string, contentType: string): string {
  if (contentType && contentType !== "application/octet-stream") return contentType;
  const ext = filename.toLowerCase().split(".").pop();
  if (ext === "pdf") return "application/pdf";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}

export async function extraerGasto(buffer: Buffer, filename: string, contentType: string): Promise<GastoExtraido> {
  if (!env.ANTHROPIC_API_KEY) {
    throw new ValidationError("La lectura de boletas no está configurada (falta ANTHROPIC_API_KEY)");
  }
  const mediaType = detectarMediaType(filename, contentType);
  if (mediaType === "image/heic" || mediaType === "image/heif") {
    throw new ValidationError("Las fotos HEIC no se pueden leer; sube la foto como JPG o PNG");
  }
  const data = buffer.toString("base64");
  const documento: Anthropic.Messages.ContentBlockParam =
    mediaType === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data } }
      : { type: "image", source: { type: "base64", media_type: mediaType as "image/jpeg" | "image/png" | "image/webp", data } };

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const respuesta = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 1024,
    messages: [{ role: "user", content: [documento, { type: "text", text: PROMPT }] }],
  });
  const bloque = respuesta.content.find((b) => b.type === "text");
  if (!bloque || bloque.type !== "text") throw new ValidationError("No se pudo leer la respuesta del modelo");

  const limpio = bloque.text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  let json: unknown;
  try {
    json = JSON.parse(limpio);
  } catch {
    throw new ValidationError("No se pudo leer la boleta (respuesta no es JSON válido)");
  }
  const parseado = gastoExtraidoSchema.safeParse(json);
  if (!parseado.success) throw new ValidationError("No se pudo leer la boleta (formato inesperado)");
  return parseado.data;
}
