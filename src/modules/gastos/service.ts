import { prisma } from "@/lib/prisma";
import { Prisma, type EmpresaGasto } from "@/generated/prisma/client";
import { paginatedResponse, type PageParams } from "@/modules/shared/pagination";
import { registrarAuditLog } from "@/modules/shared/audit";
import type { GastoInput } from "./schema";

export async function listarGastos(params: PageParams, empresa?: EmpresaGasto) {
  const where = empresa ? { empresa } : {};
  const [data, total] = await Promise.all([
    prisma.gastoOperacional.findMany({
      where,
      orderBy: { fecha: "desc" },
      skip: params.skip,
      take: params.take,
    }),
    prisma.gastoOperacional.count({ where }),
  ]);
  return paginatedResponse(data, total, params);
}

export async function crearGasto(input: GastoInput, creadoPor: string) {
  return prisma.$transaction(async (tx) => {
    const gasto = await tx.gastoOperacional.create({
      data: {
        fecha: new Date(input.fecha),
        categoria: input.categoria,
        descripcion: input.descripcion,
        pagadoA: input.pagadoA,
        monto: new Prisma.Decimal(input.monto),
        formaPago: input.formaPago,
        estadoPago: input.estadoPago,
        empresa: input.empresa,
        comprobanteUrl: input.comprobanteUrl,
        createdById: creadoPor,
      },
    });

    await registrarAuditLog(tx, {
      tabla: "gastos_operacionales",
      registroId: gasto.id,
      accion: "create",
      campoDespues: { monto: Number(gasto.monto), categoria: gasto.categoria },
      usuarioId: creadoPor,
    });

    return gasto;
  });
}
