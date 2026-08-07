export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getStorageAdapter } from "@/modules/storage";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/v1/archivos/[...key]">
) {
  try {
    await requireSession();
  } catch {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { key } = await ctx.params;
  const archivo = await getStorageAdapter().get(key.join("/"));
  if (!archivo) {
    return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
  }

  return new Response(new Uint8Array(archivo.buffer), {
    headers: { "Content-Type": archivo.contentType },
  });
}
