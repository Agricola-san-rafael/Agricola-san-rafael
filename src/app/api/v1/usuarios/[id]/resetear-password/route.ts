export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireSession, requireRole } from "@/lib/auth";
import { handleApiError } from "@/modules/shared/http";
import { resetPasswordSchema } from "@/modules/usuarios/schema";
import { resetearPassword } from "@/modules/usuarios/service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    requireRole(session, ["admin"]);
    const { id } = await params;
    const body = resetPasswordSchema.parse(await request.json());
    await resetearPassword(id, body.password);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
