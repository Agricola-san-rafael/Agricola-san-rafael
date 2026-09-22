export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, requireRole } from "@/lib/auth";
import { handleApiError } from "@/modules/shared/http";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    requireRole(session, ["admin"]);
    const { id } = await params;
    const { activo } = z.object({ activo: z.boolean() }).parse(await request.json());
    return NextResponse.json(await prisma.costoFijoRecurrente.update({ where: { id }, data: { activo } }));
  } catch (error) {
    return handleApiError(error);
  }
}
