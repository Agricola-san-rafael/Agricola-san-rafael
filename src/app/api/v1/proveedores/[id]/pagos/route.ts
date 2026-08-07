export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { handleApiError } from "@/modules/shared/http";
import { pagoSchema } from "@/modules/pagos/schema";
import { crearPago } from "@/modules/pagos/service";

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/v1/proveedores/[id]/pagos">
) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;
    const body = pagoSchema.parse(await request.json());
    const pago = await crearPago(id, body, session.userId);
    return NextResponse.json(pago, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
