export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireSession, requireRole } from "@/lib/auth";
import { handleApiError } from "@/modules/shared/http";
import { crearMovimientoChofer, movimientoChoferSchema } from "@/modules/fletes/choferes";

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    requireRole(session, ["admin"]);
    const body = movimientoChoferSchema.parse(await request.json());
    return NextResponse.json(await crearMovimientoChofer(body, session.userId), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
