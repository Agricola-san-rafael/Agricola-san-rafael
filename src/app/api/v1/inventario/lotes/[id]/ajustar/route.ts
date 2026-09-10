export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireSession, requireRole } from "@/lib/auth";
import { handleApiError } from "@/modules/shared/http";
import { ajusteStockSchema } from "@/modules/inventario/schema";
import { ajustarStockLote } from "@/modules/inventario/service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    requireRole(session, ["admin"]);
    const { id } = await params;
    const body = ajusteStockSchema.parse(await request.json());
    const lote = await ajustarStockLote(id, body.kilosAjuste, body.motivo, session.userId);
    return NextResponse.json(lote);
  } catch (error) {
    return handleApiError(error);
  }
}
