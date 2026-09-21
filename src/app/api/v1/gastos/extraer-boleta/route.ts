export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { handleApiError } from "@/modules/shared/http";
import { ValidationError } from "@/modules/shared/errors";
import { extraerGasto } from "@/modules/gastos/extraer-gasto";

export async function POST(request: Request) {
  try {
    await requireSession();
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) throw new ValidationError("Falta el archivo de la boleta");

    const gasto = await extraerGasto(Buffer.from(await file.arrayBuffer()), file.name, file.type);

    const previo =
      gasto.monto && gasto.fecha
        ? await prisma.gastoOperacional.findFirst({
            where: { fecha: new Date(gasto.fecha), monto: gasto.monto },
            select: { descripcion: true, pagadoA: true, monto: true, fecha: true },
          })
        : null;

    return NextResponse.json({
      gasto,
      duplicado: previo
        ? { descripcion: previo.descripcion ?? previo.pagadoA ?? "sin descripción", fecha: previo.fecha.toISOString().slice(0, 10), monto: Number(previo.monto) }
        : null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
