import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { env } from "@/lib/env";
import { ValidationError } from "@/modules/shared/errors";

const lineaSchema = z.object({
  variedad: z.string(),
  calibre: z.string(),
  kilos: z.number(),
  precioKg: z.number(),
});

const ventaSchema = z.object({
  clienteNombre: z.string().nullable(),
  fecha: z.string().nullable(),
  formaPago: z.enum(["contado", "credito"]).nullable(),
  estadoPago: z.enum(["pagado", "pendiente", "parcial"]).nullable(),
  nDocumento: z.string().nullable(),
  lineas: z.array(lineaSchema),
});

export type VentaExtraida = z.infer<typeof ventaSchema>;

const PROMPT = `Eres un asistente que extrae datos de ventas de palta (avocado) para un negocio agrícola chileno. La entrada puede ser una factura/boleta electrónica (imagen o PDF), o un mensaje de texto informal escrito por el dueño del negocio describiendo una venta (ej. "Gina contreras 150x2300 segunda 50x2000 descarte" significa 150 kg de Segunda a $2.300/kg y 50 kg de Descarte a $2.000/kg, vendidos a Gina Contreras).

Responde ÚNICAMENTE con un objeto JSON (sin texto adicional, sin markdown, sin \`\`\`) con esta forma exacta:

{
  "clienteNombre": string o null (nombre del cliente/comprador),
  "fecha": string "YYYY-MM-DD" o null (si el texto dice "hoy" y no hay otra pista de fecha, usa null),
  "formaPago": "contado" o "credito" o null,
  "estadoPago": "pagado" o "pendiente" o "parcial" o null,
  "nDocumento": string o null (número de factura o boleta si aparece),
  "lineas": [
    { "variedad": string, "calibre": string, "kilos": number, "precioKg": number }
  ]
}

Notas importantes:
- Las variedades comunes son: Hass, Fuerte, Edranol, Gwen. Si no se menciona variedad, asume "Hass".
- Los calibres pueden ser números (16, 18, 20, 22, 24, 28, 32, 36, etc.) o categorías: Primera, Primera Extra, Segunda, Tercera, Cuarta, Quinta, Descarte, Revuelta, Pre Calibre, Comercial A / COM A, Comercial B / COM B, Comercial C / COM C.
- En texto informal, un formato como "150x2300 segunda" significa 150 kilos a $2.300 por kilo, calibre Segunda.
- precioKg es siempre el precio unitario por kilo, no el total de la línea — si solo dan el total, divide por los kilos.
- Si el texto es una factura electrónica formal con IVA desglosado, precioKg debe ser el precio CON IVA incluido (total de la línea dividido por los kilos), no el neto.
- Si algún dato no aparece, usa null (para campos individuales) o un arreglo vacío (para "lineas").
- No inventes datos que no estén en el texto o documento.`;

function detectarMediaType(filename: string, contentType: string): string {
  if (contentType && contentType !== "application/octet-stream") return contentType;
  const ext = filename.toLowerCase().split(".").pop();
  if (ext === "pdf") return "application/pdf";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "heic") return "image/heic";
  return "image/jpeg";
}

function parsearRespuesta(texto: string): VentaExtraida {
  const textoLimpio = texto
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");

  let json: unknown;
  try {
    json = JSON.parse(textoLimpio);
  } catch {
    throw new ValidationError("No se pudo interpretar la venta (respuesta no es JSON válido)");
  }

  const parseado = ventaSchema.safeParse(json);
  if (!parseado.success) {
    throw new ValidationError("No se pudo interpretar la venta (formato inesperado)");
  }
  return parseado.data;
}

async function pedirExtraccion(
  content: Anthropic.Messages.ContentBlockParam[]
): Promise<VentaExtraida> {
  if (!env.ANTHROPIC_API_KEY) {
    throw new ValidationError("La extracción automática de ventas no está configurada (falta ANTHROPIC_API_KEY)");
  }

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const respuesta = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 2048,
    messages: [{ role: "user", content: [...content, { type: "text", text: PROMPT }] }],
  });

  const bloqueTexto = respuesta.content.find((b) => b.type === "text");
  if (!bloqueTexto || bloqueTexto.type !== "text") {
    throw new ValidationError("No se pudo leer la respuesta del modelo");
  }
  return parsearRespuesta(bloqueTexto.text);
}

export async function extraerVentaDeArchivo(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<VentaExtraida> {
  const mediaType = detectarMediaType(filename, contentType);
  const data = buffer.toString("base64");

  const documentBlock: Anthropic.Messages.ContentBlockParam =
    mediaType === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data } }
      : {
          type: "image",
          source: { type: "base64", media_type: mediaType as "image/jpeg" | "image/png" | "image/webp", data },
        };

  return pedirExtraccion([documentBlock]);
}

export async function extraerVentaDeTexto(texto: string): Promise<VentaExtraida> {
  if (!texto.trim()) throw new ValidationError("El texto está vacío");
  return pedirExtraccion([{ type: "text", text: `Mensaje del dueño describiendo la venta:\n"""${texto}"""` }]);
}
