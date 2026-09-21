export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { requireSession, requireRole } from "@/lib/auth";
import { handleApiError } from "@/modules/shared/http";
import { ValidationError } from "@/modules/shared/errors";
import { ejecutarRespaldoNeon } from "@/modules/respaldo/neon";

export async function POST() {
  try {
    const session = await requireSession();
    requireRole(session, ["admin"]);
    if (!env.NEON_API_KEY || !env.NEON_PROJECT_ID) {
      throw new ValidationError("Falta configurar NEON_API_KEY y NEON_PROJECT_ID en Vercel");
    }
    const resultado = await ejecutarRespaldoNeon({ apiKey: env.NEON_API_KEY, projectId: env.NEON_PROJECT_ID });
    return NextResponse.json(resultado);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Neon respondió")) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    return handleApiError(error);
  }
}
