export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireSession, requireRole } from "@/lib/auth";
import { handleApiError } from "@/modules/shared/http";
import {
  actualizarParametrosTransporte,
  obtenerParametrosTransporte,
  parametroTransporteSchema,
} from "@/modules/fletes/parametros";

export async function GET() {
  try {
    await requireSession();
    const parametros = await obtenerParametrosTransporte();
    return NextResponse.json(parametros);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const session = await requireSession();
    requireRole(session, ["admin"]);
    const body = parametroTransporteSchema.parse(await request.json());
    const parametros = await actualizarParametrosTransporte(body, session.userId);
    return NextResponse.json(parametros);
  } catch (error) {
    return handleApiError(error);
  }
}
