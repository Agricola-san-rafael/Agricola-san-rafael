export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { ejecutarRespaldoNeon } from "@/modules/respaldo/neon";

function autorizado(request: Request): boolean {
  if (request.headers.get("authorization") === `Bearer ${env.CRON_SECRET}`) return true;
  return request.headers.get("x-cron-secret") === env.CRON_SECRET;
}

async function ejecutar(request: Request) {
  if (!autorizado(request)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!env.NEON_API_KEY || !env.NEON_PROJECT_ID) {
    return NextResponse.json({ ok: false, motivo: "Falta configurar NEON_API_KEY y NEON_PROJECT_ID" });
  }
  try {
    const resultado = await ejecutarRespaldoNeon({ apiKey: env.NEON_API_KEY, projectId: env.NEON_PROJECT_ID });
    return NextResponse.json({ ok: true, ...resultado });
  } catch (error) {
    console.error("Falló la copia nocturna en Neon:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error" }, { status: 500 });
  }
}

export const GET = ejecutar;
export const POST = ejecutar;
