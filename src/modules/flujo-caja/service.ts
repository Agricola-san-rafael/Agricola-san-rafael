import { prisma } from "@/lib/prisma";

export interface MovimientoCaja {
  id: string;
  fecha: Date;
  tipo: "cobro" | "pago" | "gasto";
  descripcion: string;
  monto: number; // positivo = entrada, negativo = salida
}

export interface MovimientoCajaConSaldo extends MovimientoCaja {
  saldoCorrido: number;
}

/** Movimientos de caja ordenados con saldo corrido (sección 6: GET /flujo-caja). */
export async function obtenerFlujoCaja(): Promise<MovimientoCajaConSaldo[]> {
  const [cobros, pagos, gastos] = await Promise.all([
    prisma.movimientoCobro.findMany({ include: { cliente: true }, orderBy: { fecha: "asc" } }),
    prisma.movimientoPago.findMany({ include: { proveedor: true }, orderBy: { fecha: "asc" } }),
    prisma.gastoOperacional.findMany({
      where: { estadoPago: "pagado" },
      orderBy: { fecha: "asc" },
    }),
  ]);

  const movimientos: MovimientoCaja[] = [
    ...cobros.map((c) => ({
      id: c.id,
      fecha: c.fecha,
      tipo: "cobro" as const,
      descripcion: `Cobro de ${c.cliente.nombre}`,
      monto: Number(c.monto),
    })),
    ...pagos.map((p) => ({
      id: p.id,
      fecha: p.fecha,
      tipo: "pago" as const,
      descripcion: `Pago a ${p.proveedor.nombre}`,
      monto: -Number(p.monto),
    })),
    ...gastos.map((g) => ({
      id: g.id,
      fecha: g.fecha,
      tipo: "gasto" as const,
      descripcion: g.descripcion ?? g.categoria,
      monto: -Number(g.monto),
    })),
  ].sort((a, b) => a.fecha.getTime() - b.fecha.getTime());

  let saldo = 0;
  return movimientos.map((m) => {
    saldo += m.monto;
    return { ...m, saldoCorrido: saldo };
  });
}
