export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { handleApiError } from "@/modules/shared/http";
import { buscarFacturasDuplicadas } from "@/modules/compras/service";

export async function GET(request: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(request.url);
    const proveedorId = searchParams.get("proveedorId");
    const nFactura = searchParams.get("nFactura");
    if (!proveedorId || !nFactura) {
      return NextResponse.json({ duplicadas: [] });
    }
    const duplicadas = await buscarFacturasDuplicadas(proveedorId, nFactura);
    return NextResponse.json({ duplicadas });
  } catch (error) {
    return handleApiError(error);
  }
}
