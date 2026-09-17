export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireSession, requireRole } from "@/lib/auth";
import { handleApiError } from "@/modules/shared/http";
import { usuarioUpdateSchema } from "@/modules/usuarios/schema";
import { actualizarUsuario } from "@/modules/usuarios/service";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    requireRole(session, ["admin"]);
    const { id } = await params;
    const body = usuarioUpdateSchema.parse(await request.json());
    const usuario = await actualizarUsuario(id, body);
    return NextResponse.json(usuario);
  } catch (error) {
    return handleApiError(error);
  }
}
