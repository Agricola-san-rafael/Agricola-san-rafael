export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { handleApiError } from "@/modules/shared/http";
import { compraUpdateSchema } from "@/modules/compras/schema";
import { actualizarCompra, obtenerCompra } from "@/modules/compras/service";

export async function GET(_request: Request, ctx: RouteContext<"/api/v1/compras/[id]">) {
  try {
    await requireSession();
    const { id } = await ctx.params;
    const compra = await obtenerCompra(id);
    return NextResponse.json(compra);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: Request, ctx: RouteContext<"/api/v1/compras/[id]">) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;
    const body = compraUpdateSchema.parse(await request.json());
    const compra = await actualizarCompra(id, body, session.userId);
    return NextResponse.json(compra);
  } catch (error) {
    return handleApiError(error);
  }
}
