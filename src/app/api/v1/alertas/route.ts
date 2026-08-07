export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { handleApiError } from "@/modules/shared/http";
import { listarAlertas } from "@/modules/alertas/service";
import type { EstadoAlerta } from "@/generated/prisma/client";

export async function GET(request: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(request.url);
    const estado = (searchParams.get("estado") as EstadoAlerta | null) ?? undefined;
    const alertas = await listarAlertas(estado);
    return NextResponse.json({ data: alertas });
  } catch (error) {
    return handleApiError(error);
  }
}
