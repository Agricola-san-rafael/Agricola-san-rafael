export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { handleApiError } from "@/modules/shared/http";
import { obtenerLotesDisponibles } from "@/modules/inventario/service";

export async function GET() {
  try {
    await requireSession();
    const lotes = await obtenerLotesDisponibles();
    return NextResponse.json({ data: lotes });
  } catch (error) {
    return handleApiError(error);
  }
}
