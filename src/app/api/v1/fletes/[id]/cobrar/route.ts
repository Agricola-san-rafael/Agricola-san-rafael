export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { handleApiError } from "@/modules/shared/http";
import { marcarFleteCobrado } from "@/modules/fletes/service";

const bodySchema = z.object({ fecha: z.string().min(1) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const { fecha } = bodySchema.parse(await request.json());
    return NextResponse.json(await marcarFleteCobrado(id, fecha, session.userId));
  } catch (error) {
    return handleApiError(error);
  }
}
