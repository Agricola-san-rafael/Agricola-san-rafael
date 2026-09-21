export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireSession, requireRole } from "@/lib/auth";
import { handleApiError } from "@/modules/shared/http";
import { eliminarFlete } from "@/modules/fletes/service";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    requireRole(session, ["admin"]);
    const { id } = await params;
    return NextResponse.json(await eliminarFlete(id, session.userId));
  } catch (error) {
    return handleApiError(error);
  }
}
