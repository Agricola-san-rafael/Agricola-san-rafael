export const runtime = "nodejs";

import { requireSession } from "@/lib/auth";
import { handleApiError } from "@/modules/shared/http";
import { generarEstadoCuentaPDF } from "@/modules/pdf/estado-cuenta";
import { obtenerCliente } from "@/modules/clientes/service";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/v1/clientes/[id]/estado-cuenta">
) {
  try {
    await requireSession();
    const { id } = await ctx.params;
    const cliente = await obtenerCliente(id);
    const pdfBuffer = await generarEstadoCuentaPDF(id);

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="estado-cuenta-${cliente.nombre.replace(/\s+/g, "-")}.pdf"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
