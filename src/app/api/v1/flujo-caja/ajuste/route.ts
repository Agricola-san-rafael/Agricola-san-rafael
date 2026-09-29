export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireSession, requireRole } from "@/lib/auth";
import { handleApiError } from "@/modules/shared/http";
import { ajusteCajaSchema } from "@/modules/flujo-caja/schema";
import { crearAjusteCaja } from "@/modules/flujo-caja/service";

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    requireRole(session, ["admin"]);
    const body = ajusteCajaSchema.parse(await request.json());
    const ajuste = await crearAjusteCaja(body, session.userId);
    return NextResponse.json(ajuste, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
