export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { handleApiError } from "@/modules/shared/http";
import { obtenerFlujoCaja } from "@/modules/flujo-caja/service";

export async function GET() {
  try {
    await requireSession();
    const movimientos = await obtenerFlujoCaja();
    return NextResponse.json({ data: movimientos });
  } catch (error) {
    return handleApiError(error);
  }
}
