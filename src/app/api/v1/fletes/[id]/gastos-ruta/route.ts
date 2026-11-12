export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireSession, requireRole } from "@/lib/auth";
import { handleApiError } from "@/modules/shared/http";
import { gastoRutaSchema } from "@/modules/fletes/schema";
import { agregarGastoRuta } from "@/modules/fletes/service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    requireRole(session, ["admin"]);
    const { id } = await params;
    const body = gastoRutaSchema.parse(await request.json());
    return NextResponse.json(await agregarGastoRuta(id, body, session.userId), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
