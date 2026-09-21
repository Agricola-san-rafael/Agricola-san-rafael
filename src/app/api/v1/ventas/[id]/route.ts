export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireSession, requireRole } from "@/lib/auth";
import { handleApiError } from "@/modules/shared/http";
import { obtenerVenta } from "@/modules/ventas/service";
import { actualizarVenta } from "@/modules/ventas/correcciones";
import { ventaCorreccionSchema } from "@/modules/ventas/schema";

export async function GET(_request: Request, ctx: RouteContext<"/api/v1/ventas/[id]">) {
  try {
    await requireSession();
    const { id } = await ctx.params;
    const venta = await obtenerVenta(id);
    return NextResponse.json(venta);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/v1/ventas/[id]">) {
  try {
    const session = await requireSession();
    requireRole(session, ["admin"]);
    const { id } = await ctx.params;
    const body = ventaCorreccionSchema.parse(await request.json());
    const venta = await actualizarVenta(id, body, session.userId);
    return NextResponse.json(venta);
  } catch (error) {
    return handleApiError(error);
  }
}
