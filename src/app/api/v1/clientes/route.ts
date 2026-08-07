export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { handleApiError } from "@/modules/shared/http";
import { parsePageParams } from "@/modules/shared/pagination";
import { clienteSchema } from "@/modules/clientes/schema";
import { crearCliente, listarClientes } from "@/modules/clientes/service";

export async function GET(request: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(request.url);
    const activoParam = searchParams.get("activo");
    const activo = activoParam === null ? undefined : activoParam === "true";
    const result = await listarClientes(parsePageParams(searchParams), activo);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = clienteSchema.parse(await request.json());
    const cliente = await crearCliente(body, session.userId);
    return NextResponse.json(cliente, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
