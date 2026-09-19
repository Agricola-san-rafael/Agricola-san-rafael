import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { diferenciaDiasUTC } from "@/modules/shared/dates";
import { repartirCobros } from "./estado-pago";

export interface DeudaCliente {
  clienteId: string;
  nombre: string;
  telefono: string | null;
  saldo: number;
  hasta30: number;
  de31a60: number;
  mas60: number;
  diasDeudaMasAntigua: number;
}

export interface ResumenPorCobrar {
  clientes: DeudaCliente[];
  total: number;
  hasta30: number;
  de31a60: number;
  mas60: number;
}

/**
 * Deuda por cliente separada por antigüedad (días desde la fecha de la venta).
 * Lo cobrado se aplica a las ventas más antiguas primero, así que la deuda que
 * queda es siempre la más reciente.
 */
export async function obtenerPorCobrar(hoy: Date = new Date()): Promise<ResumenPorCobrar> {
  const [ventas, cobros] = await Promise.all([
    prisma.venta.findMany({
      orderBy: [{ fecha: "asc" }, { createdAt: "asc" }],
      select: {
        clienteId: true,
        fecha: true,
        total: true,
        cliente: { select: { nombre: true, telefono: true } },
      },
    }),
    prisma.movimientoCobro.groupBy({ by: ["clienteId"], _sum: { monto: true } }),
  ]);

  const cobradoPorCliente = new Map(
    cobros.map((c) => [c.clienteId, c._sum.monto ?? new Prisma.Decimal(0)]),
  );
  const ventasPorCliente = new Map<string, typeof ventas>();
  for (const v of ventas) {
    const lista = ventasPorCliente.get(v.clienteId) ?? [];
    lista.push(v);
    ventasPorCliente.set(v.clienteId, lista);
  }

  const clientes: DeudaCliente[] = [];
  for (const [clienteId, lista] of ventasPorCliente) {
    const cobrado = cobradoPorCliente.get(clienteId) ?? new Prisma.Decimal(0);
    const deuda: DeudaCliente = {
      clienteId,
      nombre: lista[0].cliente.nombre,
      telefono: lista[0].cliente.telefono,
      saldo: 0,
      hasta30: 0,
      de31a60: 0,
      mas60: 0,
      diasDeudaMasAntigua: 0,
    };

    for (const { venta, pendiente } of repartirCobros(lista, cobrado)) {
      if (!pendiente.gt(0)) continue;
      const monto = pendiente.toNumber();
      const dias = diferenciaDiasUTC(hoy, venta.fecha);
      deuda.saldo += monto;
      if (dias <= 30) deuda.hasta30 += monto;
      else if (dias <= 60) deuda.de31a60 += monto;
      else deuda.mas60 += monto;
      deuda.diasDeudaMasAntigua = Math.max(deuda.diasDeudaMasAntigua, dias);
    }
    if (deuda.saldo > 0) clientes.push(deuda);
  }

  clientes.sort((a, b) => b.saldo - a.saldo);
  const suma = (campo: "saldo" | "hasta30" | "de31a60" | "mas60") =>
    clientes.reduce((acc, c) => acc + c[campo], 0);

  return {
    clientes,
    total: suma("saldo"),
    hasta30: suma("hasta30"),
    de31a60: suma("de31a60"),
    mas60: suma("mas60"),
  };
}
