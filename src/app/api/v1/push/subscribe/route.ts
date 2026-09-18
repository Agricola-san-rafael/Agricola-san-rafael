export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { handleApiError } from "@/modules/shared/http";
import { suscripcionPushSchema } from "@/modules/push/schema";
import { guardarSuscripcion } from "@/modules/push/service";

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = suscripcionPushSchema.parse(await request.json());
    await guardarSuscripcion(session.userId, body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
