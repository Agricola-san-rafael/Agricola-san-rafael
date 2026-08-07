export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { handleApiError } from "@/modules/shared/http";
import { cobroSchema } from "@/modules/cobros/schema";
import { crearCobro } from "@/modules/cobros/service";

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/v1/clientes/[id]/cobros">
) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;
    const body = cobroSchema.parse(await request.json());
    const cobro = await crearCobro(id, body, session.userId);
    return NextResponse.json(cobro, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
