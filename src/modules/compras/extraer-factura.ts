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

const facturaSchema = z.object({
  proveedorNombre: z.string().nullable(),
  fecha: z.string().nullable(),
  nFactura: z.string().nullable(),
  neto: z.number().nullable(),
  iva: z.number().nullable(),
  lineas: z.array(lineaSchema),
});

export type FacturaExtraida = z.infer<typeof facturaSchema>;

const PROMPT = `Eres un asistente que extrae datos de facturas o boletas de compra de palta (avocado) para un negocio agrícola chileno.

Analiza el documento adjunto y responde ÚNICAMENTE con un objeto JSON (sin texto adicional, sin markdown, sin \`\`\`) con esta forma exacta:

{
  "proveedorNombre": string o null (nombre del proveedor/vendedor que emite el documento),
  "fecha": string "YYYY-MM-DD" o null,
  "nFactura": string o null (número de factura o boleta),
  "neto": number o null (monto neto total, sin IVA),
  "iva": number o null (monto de IVA),
  "lineas": [
    { "variedad": string, "calibre": string, "kilos": number, "precioKg": number }
  ]
}

Notas importantes:
- Las variedades comunes son: Hass, Fuerte, Edranol, Gwen.
- Los calibres pueden ser números (14, 16, 18, 20, 22, 24, 28, 32, 36, 40, 48, 60, 96, etc.) o categorías de calidad (Primera, Primera Extra, Segunda, Tercera, Cuarta, Quinta, Descarte, Revuelta, Sin Calibrar, Etiolada, COM A, COM B, COM C, Pre Calibre).
- Si el documento tiene varias líneas de productos (distintos calibres), inclúyelas todas en el arreglo "lineas".
- Si algún dato no aparece en el documento, usa null (para campos individuales) o un arreglo vacío (para "lineas").
- precioKg debe ser el precio unitario por kilo, no el total de la línea — si el documento solo da el total de la línea, divide por los kilos.
- No inventes datos que no estén en el documento.`;

function detectarMediaType(filename: string, contentType: string): string {
  if (contentType && contentType !== "application/octet-stream") return contentType;
  const ext = filename.toLowerCase().split(".").pop();
  if (ext === "pdf") return "application/pdf";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "heic") return "image/heic";
  return "image/jpeg";
}

export async function extraerFactura(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<FacturaExtraida> {
  if (!env.ANTHROPIC_API_KEY) {
    throw new ValidationError("La extracción automática de facturas no está configurada (falta ANTHROPIC_API_KEY)");
  }

  const mediaType = detectarMediaType(filename, contentType);
  const data = buffer.toString("base64");
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  const documentBlock =
    mediaType === "application/pdf"
      ? ({ type: "document", source: { type: "base64", media_type: "application/pdf", data } } as const)
      : ({
          type: "image",
          source: { type: "base64", media_type: mediaType as "image/jpeg" | "image/png" | "image/webp", data },
        } as const);

  const respuesta = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: [documentBlock, { type: "text", text: PROMPT }],
      },
    ],
  });

  const bloqueTexto = respuesta.content.find((b) => b.type === "text");
  if (!bloqueTexto || bloqueTexto.type !== "text") {
    throw new ValidationError("No se pudo leer la respuesta del modelo");
  }

  const textoLimpio = bloqueTexto.text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");

  let json: unknown;
  try {
    json = JSON.parse(textoLimpio);
  } catch {
    throw new ValidationError("La factura no se pudo interpretar (respuesta no es JSON válido)");
  }

  const parseado = facturaSchema.safeParse(json);
  if (!parseado.success) {
    throw new ValidationError("La factura no se pudo interpretar (formato inesperado)");
  }
  return parseado.data;
}
