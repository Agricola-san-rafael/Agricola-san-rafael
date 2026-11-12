export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireSession, requireRole } from "@/lib/auth";
import { handleApiError } from "@/modules/shared/http";
import { eliminarGastoRuta } from "@/modules/fletes/service";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; gastoId: string }> }) {
  try {
    const session = await requireSession();
    requireRole(session, ["admin"]);
    const { id, gastoId } = await params;
    return NextResponse.json(await eliminarGastoRuta(id, gastoId, session.userId));
  } catch (error) {
    return handleApiError(error);
  }
}
