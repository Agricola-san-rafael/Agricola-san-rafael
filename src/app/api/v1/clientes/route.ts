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
    const empresa = searchParams.get("empresa") === "transporte" ? "transporte" : "agricola";
    const result = await listarClientes(parsePageParams(searchParams), empresa, activo);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const { empresa, ...rest } = clienteSchema.parse(await request.json());
    const cliente = await crearCliente(rest, session.userId, empresa);
    return NextResponse.json(cliente, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
