export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { handleApiError } from "@/modules/shared/http";
import { adjuntarComprobanteCobro } from "@/modules/cobros/service";

const bodySchema = z.object({ comprobanteUrl: z.string().min(1, "Falta el comprobante") });

/** Adjunta la foto del comprobante a un cobro ya registrado. */
export async function PUT(request: Request, ctx: RouteContext<"/api/v1/cobros/[id]/comprobante">) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;
    const { comprobanteUrl } = bodySchema.parse(await request.json());
    const cobro = await adjuntarComprobanteCobro(id, comprobanteUrl, session.userId);
    return NextResponse.json(cobro);
  } catch (error) {
    return handleApiError(error);
  }
}
