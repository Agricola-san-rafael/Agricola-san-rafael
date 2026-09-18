export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { generarAlertas } from "@/modules/alertas/generar-alertas";
import { enviarAlertasPendientes } from "@/modules/alertas/service";

/**
 * Vercel Cron Jobs llaman por GET e incluyen automáticamente
 * `Authorization: Bearer <CRON_SECRET>` si la variable de entorno del
 * proyecto se llama CRON_SECRET (convención de Vercel). Se mantiene el
 * header `x-cron-secret` + POST para invocarlo manualmente o desde otro
 * scheduler (ej. crontab de un VPS).
 */
function autorizado(request: Request): boolean {
  const bearer = request.headers.get("authorization");
  if (bearer === `Bearer ${env.CRON_SECRET}`) return true;
  const custom = request.headers.get("x-cron-secret");
  return custom === env.CRON_SECRET;
}

async function ejecutar() {
  const generadas = await generarAlertas();
  const enviadas = await enviarAlertasPendientes();
  return { ...generadas, ...enviadas };
}

export async function GET(request: Request) {
  if (!autorizado(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const resultado = await ejecutar();
  return NextResponse.json(resultado);
}

export async function POST(request: Request) {
  if (!autorizado(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const resultado = await ejecutar();
  return NextResponse.json(resultado);
}
