export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { handleApiError } from "@/modules/shared/http";
import { listarTiposCaja } from "@/modules/cajas/service";

export async function GET() {
  try {
    await requireSession();
    const tipos = await listarTiposCaja();
    return NextResponse.json({ data: tipos });
  } catch (error) {
    return handleApiError(error);
  }
}
