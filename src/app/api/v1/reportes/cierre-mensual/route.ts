export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireSession, requireRole } from "@/lib/auth";
import { handleApiError } from "@/modules/shared/http";
import { ValidationError } from "@/modules/shared/errors";
import { generarExcelCierre, mesValido } from "@/modules/reportes/cierre-mensual";

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    requireRole(session, ["admin"]);
    const mes = new URL(request.url).searchParams.get("mes") ?? undefined;
    if (!mesValido(mes)) throw new ValidationError("El mes debe tener el formato AAAA-MM");

    const excel = await generarExcelCierre(mes);
    return new NextResponse(new Uint8Array(excel), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="cierre-${mes}.xlsx"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
