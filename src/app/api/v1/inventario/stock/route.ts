export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { handleApiError } from "@/modules/shared/http";
import { obtenerStockActual } from "@/modules/inventario/service";

export async function GET() {
  try {
    await requireSession();
    const stock = await obtenerStockActual();
    return NextResponse.json({ data: stock });
  } catch (error) {
    return handleApiError(error);
  }
}
