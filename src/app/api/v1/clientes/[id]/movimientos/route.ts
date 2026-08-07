export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { handleApiError } from "@/modules/shared/http";
import { obtenerMovimientosCliente } from "@/modules/clientes/service";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/v1/clientes/[id]/movimientos">
) {
  try {
    await requireSession();
    const { id } = await ctx.params;
    const movimientos = await obtenerMovimientosCliente(id);
    return NextResponse.json({ data: movimientos });
  } catch (error) {
    return handleApiError(error);
  }
}
