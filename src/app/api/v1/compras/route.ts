export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { handleApiError } from "@/modules/shared/http";
import { parsePageParams } from "@/modules/shared/pagination";
import { compraSchema } from "@/modules/compras/schema";
import { crearCompra, listarCompras } from "@/modules/compras/service";

export async function GET(request: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(request.url);
    const result = await listarCompras(parsePageParams(searchParams), {
      desde: searchParams.get("desde") ?? undefined,
      hasta: searchParams.get("hasta") ?? undefined,
      proveedorId: searchParams.get("proveedorId") ?? undefined,
      estadoPago: (searchParams.get("estadoPago") as "pagado" | "pendiente" | "parcial") ?? undefined,
    });
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = compraSchema.parse(await request.json());
    const compra = await crearCompra(body, session.userId);
    return NextResponse.json(compra, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
