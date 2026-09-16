export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireSession, requireRole } from "@/lib/auth";
import { handleApiError } from "@/modules/shared/http";
import { ajusteCajaSchema } from "@/modules/cajas/schema";
import { ajustarStockCaja } from "@/modules/cajas/service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    requireRole(session, ["admin"]);
    const { id } = await params;
    const body = ajusteCajaSchema.parse(await request.json());
    const tipoCaja = await ajustarStockCaja(id, body.cantidad, body.motivo, session.userId);
    return NextResponse.json(tipoCaja);
  } catch (error) {
    return handleApiError(error);
  }
}
