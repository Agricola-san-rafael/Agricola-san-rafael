export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { handleApiError } from "@/modules/shared/http";
import { obtenerVenta } from "@/modules/ventas/service";

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
