export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireSession, requireRole } from "@/lib/auth";
import { handleApiError } from "@/modules/shared/http";
import { anulacionSchema } from "@/modules/shared/anulacion";
import { anularCompra } from "@/modules/compras/anulacion";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    requireRole(session, ["admin"]);
    const { id } = await params;
    const { motivo } = anulacionSchema.parse(await request.json());
    return NextResponse.json(await anularCompra(id, motivo, session.userId));
  } catch (error) {
    return handleApiError(error);
  }
}
