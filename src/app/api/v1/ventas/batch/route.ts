export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { handleApiError } from "@/modules/shared/http";
import { AppError } from "@/modules/shared/errors";
import { ventaSchema } from "@/modules/ventas/schema";
import { crearVenta } from "@/modules/ventas/service";

const batchSchema = z.object({ ventas: z.array(ventaSchema).min(1).max(20) });

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = batchSchema.parse(await request.json());

    const resultados = [];
    for (const [index, ventaInput] of body.ventas.entries()) {
      try {
        const venta = await crearVenta(ventaInput, session.userId, session.rol);
        resultados.push({ index, ok: true as const, ventaId: venta.id, total: venta.total.toNumber() });
      } catch (error) {
        const message = error instanceof AppError ? error.message : "No se pudo registrar esta línea";
        resultados.push({ index, ok: false as const, error: message });
      }
    }

    return NextResponse.json({ resultados });
  } catch (error) {
    return handleApiError(error);
  }
}
