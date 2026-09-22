export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { handleApiError } from "@/modules/shared/http";
import { ValidationError } from "@/modules/shared/errors";
import { extraerViajesDeArchivo, extraerViajesDeTexto, type ViajeExtraido } from "@/modules/fletes/extraer-viaje";

export async function POST(request: Request) {
  try {
    await requireSession();
    let viajes: ViajeExtraido[];

    if ((request.headers.get("content-type") ?? "").includes("application/json")) {
      const body = await request.json();
      if (typeof body.texto !== "string") throw new ValidationError("Falta el texto del viaje");
      viajes = await extraerViajesDeTexto(body.texto);
    } else {
      const formData = await request.formData();
      const file = formData.get("file");
      if (!(file instanceof File)) throw new ValidationError("Falta el archivo o el texto del viaje");
      viajes = await extraerViajesDeArchivo(Buffer.from(await file.arrayBuffer()), file.name, file.type);
    }

    const conDuplicado = await Promise.all(
      viajes.map(async (v) => {
        const previo =
          v.fecha && v.tarifa
            ? await prisma.flete.findFirst({ where: { fecha: new Date(v.fecha), tarifaCobrada: v.tarifa }, select: { terceroNombre: true } })
            : null;
        return { viaje: v, duplicado: previo ? (previo.terceroNombre ?? "un viaje") : null };
      }),
    );
    return NextResponse.json({ viajes: conDuplicado });
  } catch (error) {
    return handleApiError(error);
  }
}
