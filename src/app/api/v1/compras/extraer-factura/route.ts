export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { handleApiError } from "@/modules/shared/http";
import { ValidationError } from "@/modules/shared/errors";
import { extraerFactura } from "@/modules/compras/extraer-factura";

export async function POST(request: Request) {
  try {
    await requireSession();
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) throw new ValidationError("Falta el archivo de la factura");

    const buffer = Buffer.from(await file.arrayBuffer());
    const resultado = await extraerFactura(buffer, file.name, file.type);
    return NextResponse.json(resultado);
  } catch (error) {
    return handleApiError(error);
  }
}
