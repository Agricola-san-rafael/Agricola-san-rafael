import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { env } from "@/lib/env";
import { ValidationError } from "@/modules/shared/errors";

const viajeSchema = z.object({
  fecha: z.string().nullable(),
  cliente: z.string().nullable(),
  origen: z.string().nullable(),
  destino: z.string().nullable(),
  kilos: z.number().nullable(),
  km: z.number().nullable(),
  chofer: z.string().nullable(),
  costoChofer: z.number().nullable(),
  costoCombustible: z.number().nullable(),
  costoPeajes: z.number().nullable(),
  costoOtros: z.number().nullable(),
  tarifa: z.number().nullable(),
  observaciones: z.string().nullable(),
});

const respuestaSchema = z.object({ viajes: z.array(viajeSchema) });

export type ViajeExtraido = z.infer<typeof viajeSchema>;

const PROMPT = `Eres un asistente que lee mensajes informales, o facturas y comprobantes, sobre viajes de una empresa chilena de transporte de carga (Transportes San Rafael SpA). Extrae cada viaje descrito.

Responde ÚNICAMENTE con un objeto JSON (sin texto adicional, sin markdown, sin \`\`\`) con esta forma exacta:

{
  "viajes": [
    {
      "fecha": string "YYYY-MM-DD" o null (si no hay ninguna pista de fecha, usa null),
      "cliente": string o null (a quién se le cobra el viaje),
      "origen": string o null,
      "destino": string o null (si hay varios tramos, ponlos separados por " → "),
      "kilos": number o null (kilos de carga, si se mencionan),
      "km": number o null (kilómetros recorridos, si se mencionan),
      "chofer": string o null,
      "costoChofer": number o null (lo que se paga al chofer por el viaje),
      "costoCombustible": number o null (bencina, petróleo, diésel),
      "costoPeajes": number o null,
      "costoOtros": number o null (comida, viáticos, estacionamiento y cualquier otro costo del viaje),
      "tarifa": number o null (lo que se cobró o se cobra por el viaje, SIN IVA),
      "observaciones": string o null (datos útiles: km, N° de factura, si está pagado o pendiente)
    }
  ]
}

Notas importantes:
- Los montos son pesos chilenos. "250 mil" o "250k" es 250000. "29.000" es 29000.
- Si el documento es una factura con IVA, tarifa es el monto NETO (sin IVA), y en observaciones anota el N° de factura.
- Si dan un total de gastos sin desglosar, ponlo en costoOtros.
- Si el mensaje describe varios viajes, devuelve uno por viaje.
- Si un dato no aparece, usa null. No inventes datos.`;

function detectarMediaType(filename: string, contentType: string): string {
  if (contentType && contentType !== "application/octet-stream") return contentType;
  const ext = filename.toLowerCase().split(".").pop();
  if (ext === "pdf") return "application/pdf";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}

async function pedir(content: Anthropic.Messages.ContentBlockParam[]): Promise<ViajeExtraido[]> {
  if (!env.ANTHROPIC_API_KEY) {
    throw new ValidationError("La lectura de viajes no está configurada (falta ANTHROPIC_API_KEY)");
  }
  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(new Date());
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const respuesta = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: [
          ...content,
          { type: "text", text: `${PROMPT}\n\nLa fecha de hoy es ${hoy}. Usa esa fecha para resolver "hoy", "ayer" o "el lunes".` },
        ],
      },
    ],
  });
  const bloque = respuesta.content.find((b) => b.type === "text");
  if (!bloque || bloque.type !== "text") throw new ValidationError("No se pudo leer la respuesta del modelo");

  const limpio = bloque.text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  let json: unknown;
  try {
    json = JSON.parse(limpio);
  } catch {
    throw new ValidationError("No se pudo interpretar el viaje (respuesta no es JSON válido)");
  }
  const parseado = respuestaSchema.safeParse(json);
  if (!parseado.success) throw new ValidationError("No se pudo interpretar el viaje (formato inesperado)");
  return parseado.data.viajes;
}

export async function extraerViajesDeTexto(texto: string): Promise<ViajeExtraido[]> {
  if (!texto.trim()) throw new ValidationError("El texto está vacío");
  return pedir([{ type: "text", text: `Mensaje del dueño describiendo el o los viajes:\n"""${texto}"""` }]);
}

export async function extraerViajesDeArchivo(buffer: Buffer, filename: string, contentType: string): Promise<ViajeExtraido[]> {
  const mediaType = detectarMediaType(filename, contentType);
  if (mediaType === "image/heic" || mediaType === "image/heif") {
    throw new ValidationError("Las fotos HEIC no se pueden leer; sube la foto como JPG o PNG");
  }
  const data = buffer.toString("base64");
  const documento: Anthropic.Messages.ContentBlockParam =
    mediaType === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data } }
      : { type: "image", source: { type: "base64", media_type: mediaType as "image/jpeg" | "image/png" | "image/webp", data } };
  return pedir([documento]);
}
