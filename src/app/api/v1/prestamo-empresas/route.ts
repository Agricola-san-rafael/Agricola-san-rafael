export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireSession, requireRole } from "@/lib/auth";
import { handleApiError } from "@/modules/shared/http";
import {
  crearMovimientoEntreEmpresas,
  movimientoEmpresasSchema,
  obtenerPrestamoEntreEmpresas,
} from "@/modules/empresas/prestamos";

export async function GET() {
  try {
    const session = await requireSession();
    requireRole(session, ["admin"]);
    return NextResponse.json(await obtenerPrestamoEntreEmpresas());
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    requireRole(session, ["admin"]);
    const body = movimientoEmpresasSchema.parse(await request.json());
    return NextResponse.json(await crearMovimientoEntreEmpresas(body, session.userId), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
