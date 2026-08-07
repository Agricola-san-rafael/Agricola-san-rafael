export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { handleApiError } from "@/modules/shared/http";
import { parsePageParams } from "@/modules/shared/pagination";
import { ventaSchema } from "@/modules/ventas/schema";
import { crearVenta, listarVentas } from "@/modules/ventas/service";

export async function GET(request: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(request.url);
    const result = await listarVentas(parsePageParams(searchParams), {
      desde: searchParams.get("desde") ?? undefined,
      hasta: searchParams.get("hasta") ?? undefined,
      clienteId: searchParams.get("clienteId") ?? undefined,
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
    const body = ventaSchema.parse(await request.json());
    const venta = await crearVenta(body, session.userId, session.rol);
    return NextResponse.json(venta, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
