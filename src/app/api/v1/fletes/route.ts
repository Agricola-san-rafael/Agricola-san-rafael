export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { handleApiError } from "@/modules/shared/http";
import { fleteSchema } from "@/modules/fletes/schema";
import { crearFlete } from "@/modules/fletes/service";

export async function GET() {
  try {
    await requireSession();
    const fletes = await prisma.flete.findMany({ orderBy: { fecha: "desc" }, take: 100 });
    return NextResponse.json(fletes);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = fleteSchema.parse(await request.json());
    const flete = await crearFlete(body, session.userId);
    return NextResponse.json(flete, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
