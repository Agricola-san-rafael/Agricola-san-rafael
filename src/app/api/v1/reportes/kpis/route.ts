export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { handleApiError } from "@/modules/shared/http";
import { obtenerKPIs } from "@/modules/reportes/service";

export async function GET() {
  try {
    await requireSession();
    const kpis = await obtenerKPIs();
    return NextResponse.json(kpis);
  } catch (error) {
    return handleApiError(error);
  }
}
