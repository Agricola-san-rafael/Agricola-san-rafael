export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { handleApiError } from "@/modules/shared/http";
import { ValidationError } from "@/modules/shared/errors";
import { getStorageAdapter } from "@/modules/storage";

const CARPETAS_VALIDAS = ["cobros", "pagos", "gastos"];

export async function POST(request: Request) {
  try {
    await requireSession();
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) throw new ValidationError("Falta el archivo");

    const carpetaRaw = String(formData.get("carpeta") ?? "otros");
    const carpeta = CARPETAS_VALIDAS.includes(carpetaRaw) ? carpetaRaw : "otros";

    const buffer = Buffer.from(await file.arrayBuffer());
    const key = await getStorageAdapter().upload({
      buffer,
      filename: file.name,
      contentType: file.type,
      carpeta,
    });

    return NextResponse.json({ key }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
