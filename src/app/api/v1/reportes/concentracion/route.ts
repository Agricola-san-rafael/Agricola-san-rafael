export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { handleApiError } from "@/modules/shared/http";
import { obtenerConcentracion } from "@/modules/reportes/service";

export async function GET() {
  try {
    await requireSession();
    const concentracion = await obtenerConcentracion();
    return NextResponse.json(concentracion);
  } catch (error) {
    return handleApiError(error);
  }
}
