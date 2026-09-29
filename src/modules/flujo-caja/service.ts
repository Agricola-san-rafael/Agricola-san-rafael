import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { registrarAuditLog } from "@/modules/shared/audit";

export interface MovimientoCaja {
  id: string;
  fecha: Date;
  tipo: "cobro" | "pago" | "gasto" | "ajuste";
  descripcion: string;
  monto: number; // positivo = entrada, negativo = salida
}

export interface MovimientoCajaConSaldo extends MovimientoCaja {
  saldoCorrido: number;
}

/**
 * Movimientos de caja ordenados con saldo corrido (sección 6: GET /flujo-caja).
 * Los ajustes existen porque el saldo no parte de un monto inicial real: sin
 * uno, el saldo corrido solo refleja lo cobrado/pagado/gastado desde el
 * primer movimiento registrado, no la plata que el negocio ya tenía antes.
 */
export async function obtenerFlujoCaja(): Promise<MovimientoCajaConSaldo[]> {
  const [cobros, pagos, gastos, ajustes] = await Promise.all([
    prisma.movimientoCobro.findMany({ include: { cliente: true }, orderBy: { fecha: "asc" } }),
    prisma.movimientoPago.findMany({ include: { proveedor: true }, orderBy: { fecha: "asc" } }),
    prisma.gastoOperacional.findMany({
      where: { estadoPago: "pagado" },
      orderBy: { fecha: "asc" },
    }),
    prisma.ajusteCaja.findMany({ orderBy: { fecha: "asc" } }),
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
    ...ajustes.map((a) => ({
      id: a.id,
      fecha: a.fecha,
      tipo: "ajuste" as const,
      descripcion: a.motivo,
      monto: Number(a.monto),
    })),
  ].sort((a, b) => a.fecha.getTime() - b.fecha.getTime());

  let saldo = 0;
  return movimientos.map((m) => {
    saldo += m.monto;
    return { ...m, saldoCorrido: saldo };
  });
}

/** Registra un ajuste manual de caja (saldo inicial, arqueo, retiro/aporte). */
export async function crearAjusteCaja(
  input: { fecha: string; monto: number; motivo: string },
  creadoPor: string
) {
  return prisma.$transaction(async (tx) => {
    const ajuste = await tx.ajusteCaja.create({
      data: {
        fecha: new Date(input.fecha),
        monto: new Prisma.Decimal(input.monto),
        motivo: input.motivo,
        createdById: creadoPor,
      },
    });
    await registrarAuditLog(tx, {
      tabla: "ajustes_caja",
      registroId: ajuste.id,
      accion: "create",
      campoDespues: { monto: input.monto, motivo: input.motivo },
      usuarioId: creadoPor,
    });
    return ajuste;
  });
}
