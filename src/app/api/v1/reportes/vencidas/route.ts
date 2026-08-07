export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { handleApiError } from "@/modules/shared/http";
import { obtenerVencidas } from "@/modules/reportes/service";

export async function GET() {
  try {
    await requireSession();
    const vencidas = await obtenerVencidas();
    return NextResponse.json({ data: vencidas });
  } catch (error) {
    return handleApiError(error);
  }
}
