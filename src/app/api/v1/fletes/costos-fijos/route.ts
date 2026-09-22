export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { requireSession, requireRole } from "@/lib/auth";
import { handleApiError } from "@/modules/shared/http";
import { costoFijoSchema } from "@/modules/fletes/costo-fijo-schema";

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    requireRole(session, ["admin"]);
    const b = costoFijoSchema.parse(await request.json());
    const creado = await prisma.costoFijoRecurrente.create({
      data: {
        empresa: b.empresa,
        concepto: b.concepto,
        categoria: b.categoria,
        monto: new Prisma.Decimal(b.monto),
        diaDelMes: b.diaDelMes,
        desde: new Date(b.desde),
        pagadoPorAgricola: b.empresa === "transporte" && b.pagadoPorAgricola,
      },
    });
    return NextResponse.json(creado, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
