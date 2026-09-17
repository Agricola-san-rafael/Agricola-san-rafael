export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireSession, requireRole } from "@/lib/auth";
import { handleApiError } from "@/modules/shared/http";
import { usuarioSchema } from "@/modules/usuarios/schema";
import { crearUsuario, listarUsuarios } from "@/modules/usuarios/service";

export async function GET() {
  try {
    const session = await requireSession();
    requireRole(session, ["admin"]);
    const usuarios = await listarUsuarios();
    return NextResponse.json({ data: usuarios });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    requireRole(session, ["admin"]);
    const body = usuarioSchema.parse(await request.json());
    const usuario = await crearUsuario(body);
    return NextResponse.json(usuario, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
