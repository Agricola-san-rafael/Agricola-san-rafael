export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { handleApiError } from "@/modules/shared/http";
import { proveedorUpdateSchema } from "@/modules/proveedores/schema";
import { actualizarProveedor, obtenerProveedor } from "@/modules/proveedores/service";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/v1/proveedores/[id]">
) {
  try {
    await requireSession();
    const { id } = await ctx.params;
    const proveedor = await obtenerProveedor(id);
    return NextResponse.json(proveedor);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: Request,
  ctx: RouteContext<"/api/v1/proveedores/[id]">
) {
  try {
    await requireSession();
    const { id } = await ctx.params;
    const body = proveedorUpdateSchema.parse(await request.json());
    const proveedor = await actualizarProveedor(id, body);
    return NextResponse.json(proveedor);
  } catch (error) {
    return handleApiError(error);
  }
}
