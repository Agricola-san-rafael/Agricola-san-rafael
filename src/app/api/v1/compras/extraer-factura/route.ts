export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { handleApiError } from "@/modules/shared/http";
import { ValidationError } from "@/modules/shared/errors";
import { extraerFactura, extraerFacturaDeTexto } from "@/modules/compras/extraer-factura";

export async function POST(request: Request) {
  try {
    await requireSession();
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const body = await request.json();
      if (typeof body.texto !== "string") throw new ValidationError("Falta el texto de la compra");
      const resultado = await extraerFacturaDeTexto(body.texto);
      return NextResponse.json(resultado);
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) throw new ValidationError("Falta el archivo o el texto de la compra");

    const buffer = Buffer.from(await file.arrayBuffer());
    const resultado = await extraerFactura(buffer, file.name, file.type);
    return NextResponse.json(resultado);
  } catch (error) {
    return handleApiError(error);
  }
}
