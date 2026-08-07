export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { handleApiError } from "@/modules/shared/http";
import { parsePageParams } from "@/modules/shared/pagination";
import { gastoSchema } from "@/modules/gastos/schema";
import { crearGasto, listarGastos } from "@/modules/gastos/service";

export async function GET(request: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(request.url);
    const result = await listarGastos(parsePageParams(searchParams));
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = gastoSchema.parse(await request.json());
    const gasto = await crearGasto(body, session.userId);
    return NextResponse.json(gasto, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
