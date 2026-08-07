export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { handleApiError } from "@/modules/shared/http";
import { actualizarEstadoAlerta } from "@/modules/alertas/service";

const patchSchema = z.object({
  estado: z.enum(["pendiente", "enviada", "resuelta"]),
});

export async function PATCH(request: Request, ctx: RouteContext<"/api/v1/alertas/[id]">) {
  try {
    await requireSession();
    const { id } = await ctx.params;
    const body = patchSchema.parse(await request.json());
    const alerta = await actualizarEstadoAlerta(id, body.estado);
    return NextResponse.json(alerta);
  } catch (error) {
    return handleApiError(error);
  }
}
