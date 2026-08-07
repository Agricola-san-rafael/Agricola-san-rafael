export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { handleApiError } from "@/modules/shared/http";
import { clienteUpdateSchema } from "@/modules/clientes/schema";
import { actualizarCliente, obtenerCliente } from "@/modules/clientes/service";

export async function GET(_request: Request, ctx: RouteContext<"/api/v1/clientes/[id]">) {
  try {
    await requireSession();
    const { id } = await ctx.params;
    const cliente = await obtenerCliente(id);
    return NextResponse.json(cliente);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: Request, ctx: RouteContext<"/api/v1/clientes/[id]">) {
  try {
    await requireSession();
    const { id } = await ctx.params;
    const body = clienteUpdateSchema.parse(await request.json());
    const cliente = await actualizarCliente(id, body);
    return NextResponse.json(cliente);
  } catch (error) {
    return handleApiError(error);
  }
}
