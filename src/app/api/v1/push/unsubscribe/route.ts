export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { handleApiError } from "@/modules/shared/http";
import { eliminarSuscripcion } from "@/modules/push/service";

const bodySchema = z.object({ endpoint: z.string().min(1) });

export async function POST(request: Request) {
  try {
    await requireSession();
    const body = bodySchema.parse(await request.json());
    await eliminarSuscripcion(body.endpoint);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
