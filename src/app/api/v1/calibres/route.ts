export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { handleApiError } from "@/modules/shared/http";
import { calibreSchema } from "@/modules/catalogos/schema";
import { crearCalibre, listarCalibres } from "@/modules/catalogos/service";

export async function GET() {
  try {
    await requireSession();
    const calibres = await listarCalibres();
    return NextResponse.json({ data: calibres });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireSession();
    const body = calibreSchema.parse(await request.json());
    const calibre = await crearCalibre(body);
    return NextResponse.json(calibre, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
