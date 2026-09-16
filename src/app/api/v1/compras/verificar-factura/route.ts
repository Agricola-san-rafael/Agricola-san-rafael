export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { handleApiError } from "@/modules/shared/http";
import { buscarComprasDuplicadas } from "@/modules/compras/service";

export async function GET(request: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(request.url);
    const proveedorId = searchParams.get("proveedorId");
    if (!proveedorId) {
      return NextResponse.json({ duplicadas: [] });
    }

    const nFactura = searchParams.get("nFactura") ?? undefined;
    const fecha = searchParams.get("fecha") ?? undefined;
    const calibreId = searchParams.get("calibreId") ?? undefined;
    const kilosParam = searchParams.get("kilos");
    const kilos = kilosParam ? Number(kilosParam) : undefined;

    if (!nFactura?.trim() && !(fecha && calibreId && kilos)) {
      return NextResponse.json({ duplicadas: [] });
    }

    const duplicadas = await buscarComprasDuplicadas({ proveedorId, nFactura, fecha, calibreId, kilos });
    return NextResponse.json({ duplicadas });
  } catch (error) {
    return handleApiError(error);
  }
}
