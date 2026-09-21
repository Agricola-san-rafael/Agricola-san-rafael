export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireSession, requireRole } from "@/lib/auth";
import { handleApiError } from "@/modules/shared/http";
import { generarRespaldoCompleto } from "@/modules/respaldo/exportar";

export async function GET() {
  try {
    const session = await requireSession();
    requireRole(session, ["admin"]);
    const { buffer } = await generarRespaldoCompleto(session.userId);
    const fecha = new Date().toISOString().slice(0, 10);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="respaldo-agricola-${fecha}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
