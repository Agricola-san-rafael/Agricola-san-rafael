export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireSession, requireRole } from "@/lib/auth";
import { handleApiError } from "@/modules/shared/http";
import { quitarCuentaOrigen } from "@/modules/cobros/cuentas-cliente";

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/v1/clientes/[id]/cuentas-origen/[cuentaId]">
) {
  try {
    const session = await requireSession();
    requireRole(session, ["admin", "operador"]);
    const { id, cuentaId } = await ctx.params;
    await quitarCuentaOrigen(id, cuentaId, session.userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
