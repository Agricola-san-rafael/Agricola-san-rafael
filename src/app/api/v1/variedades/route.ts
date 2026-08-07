export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { handleApiError } from "@/modules/shared/http";
import { variedadSchema } from "@/modules/catalogos/schema";
import { crearVariedad, listarVariedades } from "@/modules/catalogos/service";

export async function GET() {
  try {
    await requireSession();
    const variedades = await listarVariedades();
    return NextResponse.json({ data: variedades });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireSession();
    const body = variedadSchema.parse(await request.json());
    const variedad = await crearVariedad(body);
    return NextResponse.json(variedad, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
