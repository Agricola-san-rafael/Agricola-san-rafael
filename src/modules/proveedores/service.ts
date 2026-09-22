import { prisma } from "@/lib/prisma";
import type { EmpresaGasto } from "@/generated/prisma/client";
import { NotFoundError } from "@/modules/shared/errors";
import { paginatedResponse, type PageParams } from "@/modules/shared/pagination";
import type { ProveedorInput, ProveedorUpdateInput } from "./schema";

interface SaldoProveedorRow {
  proveedor_id: string;
  nombre: string;
  saldo_pendiente: string;
}

export async function listarProveedores(params: PageParams, empresa: EmpresaGasto, activo?: boolean) {
  const where = { empresa, ...(activo === undefined ? {} : { activo }) };
  const [data, total] = await Promise.all([
    prisma.proveedor.findMany({
      where,
      orderBy: { nombre: "asc" },
      skip: params.skip,
      take: params.take,
    }),
    prisma.proveedor.count({ where }),
  ]);
  return paginatedResponse(data, total, params);
}

export async function obtenerProveedor(id: string) {
  const proveedor = await prisma.proveedor.findUnique({ where: { id } });
  if (!proveedor) throw new NotFoundError("Proveedor no encontrado");

  const saldoRows = await prisma.$queryRaw<SaldoProveedorRow[]>`
    SELECT proveedor_id, nombre, saldo_pendiente
    FROM vista_saldo_proveedores
    WHERE proveedor_id = ${id}
  `;
  const saldoPendiente = saldoRows[0] ? Number(saldoRows[0].saldo_pendiente) : 0;

  return { ...proveedor, saldoPendiente };
}

export async function crearProveedor(input: Omit<ProveedorInput, "empresa">, creadoPor: string, empresa: EmpresaGasto) {
  return prisma.proveedor.create({
    data: { ...input, empresa, createdBy: creadoPor },
  });
}

export async function actualizarProveedor(id: string, input: ProveedorUpdateInput) {
  const existente = await prisma.proveedor.findUnique({ where: { id } });
  if (!existente) throw new NotFoundError("Proveedor no encontrado");
  return prisma.proveedor.update({ where: { id }, data: input });
}

/** Gastos operacionales del transporte que coinciden con el nombre de este proveedor
 * (no hay FK directa desde gastos_operacionales; se cruza por el texto "pagado a"). */
export async function obtenerGastosProveedor(nombreProveedor: string, empresa: EmpresaGasto) {
  return prisma.gastoOperacional.findMany({
    where: { empresa, pagadoA: { equals: nombreProveedor, mode: "insensitive" } },
    orderBy: { fecha: "desc" },
  });
}
