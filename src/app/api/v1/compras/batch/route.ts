export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { handleApiError } from "@/modules/shared/http";
import { AppError } from "@/modules/shared/errors";
import { compraSchema } from "@/modules/compras/schema";
import { crearCompra } from "@/modules/compras/service";

const batchSchema = z.object({ compras: z.array(compraSchema).min(1).max(20) });

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = batchSchema.parse(await request.json());

    const resultados = [];
    for (const [index, compraInput] of body.compras.entries()) {
      try {
        const compra = await crearCompra(compraInput, session.userId);
        resultados.push({ index, ok: true as const, compraId: compra.id, total: compra.total.toNumber() });
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
