export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireSession, requireRole } from "@/lib/auth";
import { handleApiError } from "@/modules/shared/http";
import { conteoSchema } from "@/modules/mermas/schema";
import { registrarConteo } from "@/modules/mermas/service";

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    requireRole(session, ["admin"]);
    const body = conteoSchema.parse(await request.json());
    const resultado = await registrarConteo(body, session.userId);
    return NextResponse.json(resultado, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
