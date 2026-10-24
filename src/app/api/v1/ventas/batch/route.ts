export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { handleApiError } from "@/modules/shared/http";
import { ventaSchema } from "@/modules/ventas/schema";
import { crearVentas } from "@/modules/ventas/service";

const batchSchema = z.object({ ventas: z.array(ventaSchema).min(1).max(20) });

/** Registra varias ventas juntas (un producto cada una): se guardan todas o ninguna. */
export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = batchSchema.parse(await request.json());

    const ventas = await crearVentas(body.ventas, session.userId, session.rol);
    const resultados = ventas.map((venta, index) => ({
      index,
      ok: true as const,
      ventaId: venta.id,
      total: venta.total.toNumber(),
    }));

    return NextResponse.json({ resultados });
  } catch (error) {
    return handleApiError(error);
  }
}
