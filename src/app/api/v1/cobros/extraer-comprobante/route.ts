export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { handleApiError } from "@/modules/shared/http";
import { ValidationError } from "@/modules/shared/errors";
import { extraerComprobante } from "@/modules/cobros/extraer-comprobante";
import { obtenerPorCobrar } from "@/modules/cobros/por-cobrar";
import { sugerirCliente } from "@/modules/cobros/sugerir-cliente";

export async function POST(request: Request) {
  try {
    await requireSession();
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) throw new ValidationError("Falta el archivo del comprobante");

    const buffer = Buffer.from(await file.arrayBuffer());
    const comprobante = await extraerComprobante(buffer, file.name, file.type);

    const [clientes, deuda] = await Promise.all([
      prisma.cliente.findMany({ where: { activo: true }, select: { id: true, nombre: true, rut: true } }),
      obtenerPorCobrar(),
    ]);
    const saldos = new Map(deuda.clientes.map((c) => [c.clienteId, c.saldo]));
    const clienteSugeridoId = sugerirCliente(
      clientes.map((c) => ({ ...c, saldo: saldos.get(c.id) ?? 0 })),
      comprobante,
    );

    const previo = comprobante.numeroOperacion
      ? await prisma.movimientoCobro.findFirst({
          where: { referencia: { contains: comprobante.numeroOperacion } },
          include: { cliente: { select: { nombre: true } } },
        })
      : null;

    return NextResponse.json({
      comprobante,
      clienteSugeridoId,
      duplicado: previo
        ? { cliente: previo.cliente.nombre, fecha: previo.fecha.toISOString().slice(0, 10), monto: Number(previo.monto) }
        : null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
