import { prisma } from "@/lib/prisma";
import { NotFoundError } from "@/modules/shared/errors";
import { paginatedResponse, type PageParams } from "@/modules/shared/pagination";
import type { ClienteInput, ClienteUpdateInput } from "./schema";

interface SaldoClienteRow {
  cliente_id: string;
  nombre: string;
  saldo_pendiente: string;
}

export async function listarClientes(params: PageParams, activo?: boolean) {
  const where = activo === undefined ? {} : { activo };
  const [data, total] = await Promise.all([
    prisma.cliente.findMany({
      where,
      orderBy: { nombre: "asc" },
      skip: params.skip,
      take: params.take,
    }),
    prisma.cliente.count({ where }),
  ]);
  return paginatedResponse(data, total, params);
}

export async function obtenerSaldoCliente(id: string): Promise<number> {
  const rows = await prisma.$queryRaw<SaldoClienteRow[]>`
    SELECT cliente_id, nombre, saldo_pendiente
    FROM vista_saldo_clientes
    WHERE cliente_id = ${id}
  `;
  return rows[0] ? Number(rows[0].saldo_pendiente) : 0;
}

export async function obtenerCliente(id: string) {
  const cliente = await prisma.cliente.findUnique({ where: { id } });
  if (!cliente) throw new NotFoundError("Cliente no encontrado");
  const saldoPendiente = await obtenerSaldoCliente(id);
  return { ...cliente, saldoPendiente };
}

export async function crearCliente(input: ClienteInput, creadoPor: string) {
  return prisma.cliente.create({ data: { ...input, createdBy: creadoPor } });
}

export async function actualizarCliente(id: string, input: ClienteUpdateInput) {
  const existente = await prisma.cliente.findUnique({ where: { id } });
  if (!existente) throw new NotFoundError("Cliente no encontrado");
  return prisma.cliente.update({ where: { id }, data: input });
}

export interface MovimientoCliente {
  tipo: "venta" | "cobro";
  id: string;
  fecha: Date;
  monto: number;
  detalle: string;
}

/** Historial cronológico de ventas + cobros de un cliente (reemplaza EstadoCuenta_*.xlsx). */
export async function obtenerMovimientosCliente(id: string): Promise<MovimientoCliente[]> {
  const cliente = await prisma.cliente.findUnique({ where: { id } });
  if (!cliente) throw new NotFoundError("Cliente no encontrado");

  const [ventas, cobros] = await Promise.all([
    prisma.venta.findMany({ where: { clienteId: id }, orderBy: { fecha: "asc" } }),
    prisma.movimientoCobro.findMany({ where: { clienteId: id }, orderBy: { fecha: "asc" } }),
  ]);

  const movimientos: MovimientoCliente[] = [
    ...ventas.map((v) => ({
      tipo: "venta" as const,
      id: v.id,
      fecha: v.fecha,
      monto: Number(v.total),
      detalle: `Venta ${v.kilos} kg${v.forzada ? " (forzada)" : ""}`,
    })),
    ...cobros.map((c) => ({
      tipo: "cobro" as const,
      id: c.id,
      fecha: c.fecha,
      monto: -Number(c.monto),
      detalle: `Cobro (${c.medioPago})`,
    })),
  ];

  return movimientos.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
}
