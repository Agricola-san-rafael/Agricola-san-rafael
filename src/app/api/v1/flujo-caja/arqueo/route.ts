export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireSession, requireRole } from "@/lib/auth";
import { handleApiError } from "@/modules/shared/http";
import { arqueoSchema } from "@/modules/flujo-caja/schema";
import { crearArqueo } from "@/modules/flujo-caja/service";

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    requireRole(session, ["admin"]);
    const body = arqueoSchema.parse(await request.json());
    const resultado = await crearArqueo(body, session.userId);
    return NextResponse.json(resultado, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
