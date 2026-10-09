import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { registrarAuditLog } from "@/modules/shared/audit";
import { formatCLP } from "@/modules/shared/money";
import { diferenciaDiasUTC } from "@/modules/shared/dates";
import {
  cajaDeGasto,
  cajaDeMedioPago,
  PREFIJO_ARQUEO,
  redondear2,
  sumarSaldos,
  type Caja,
  type SaldosCaja,
} from "./caja";

export interface MovimientoCaja {
  id: string;
  fecha: Date;
  tipo: "cobro" | "pago" | "gasto" | "ajuste";
  descripcion: string;
  monto: number; // positivo = entrada, negativo = salida
  caja: Caja;
}

export interface MovimientoCajaConSaldo extends MovimientoCaja {
  /** Saldo corrido de las dos cajas juntas. */
  saldoCorrido: number;
  /** Saldo corrido solo de la caja a la que pertenece este movimiento. */
  saldoCaja: number;
}

/**
 * Movimientos de caja ordenados con saldo corrido (sección 6: GET /flujo-caja).
 * Los ajustes existen porque el saldo no parte de un monto inicial real: sin
 * uno, el saldo corrido solo refleja lo cobrado/pagado/gastado desde el
 * primer movimiento registrado, no la plata que el negocio ya tenía antes.
 * Cada movimiento cae en la caja de efectivo o en la del banco según con qué se pagó.
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
      caja: cajaDeMedioPago(c.medioPago),
    })),
    ...pagos.map((p) => ({
      id: p.id,
      fecha: p.fecha,
      tipo: "pago" as const,
      descripcion: `Pago a ${p.proveedor.nombre}`,
      monto: -Number(p.monto),
      caja: cajaDeMedioPago(p.medioPago),
    })),
    ...gastos.map((g) => ({
      id: g.id,
      fecha: g.fecha,
      tipo: "gasto" as const,
      descripcion: g.descripcion ?? g.categoria,
      monto: -Number(g.monto),
      caja: cajaDeGasto(g.formaPago),
    })),
    ...ajustes.map((a) => ({
      id: a.id,
      fecha: a.fecha,
      tipo: "ajuste" as const,
      descripcion: a.motivo,
      monto: Number(a.monto),
      caja: a.caja,
    })),
  ].sort((a, b) => a.fecha.getTime() - b.fecha.getTime());

  let total = 0;
  const porCaja: Record<Caja, number> = { efectivo: 0, banco: 0 };
  return movimientos.map((m) => {
    total += m.monto;
    porCaja[m.caja] += m.monto;
    return { ...m, saldoCorrido: total, saldoCaja: porCaja[m.caja] };
  });
}

export interface ResumenCaja {
  saldos: SaldosCaja;
  ultimoArqueo: { fecha: Date; dias: number } | null;
}

/** Cuánto hay en cada caja y cuándo fue el último arqueo (el conteo real de la plata). */
export async function obtenerResumenCaja(hoy: Date = new Date()): Promise<ResumenCaja> {
  const [flujo, arqueos] = await Promise.all([
    obtenerFlujoCaja(),
    prisma.ajusteCaja.findMany({
      where: { motivo: { startsWith: PREFIJO_ARQUEO } },
      orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
      take: 1,
    }),
  ]);
  const ultimo = arqueos[0];
  return {
    saldos: sumarSaldos(flujo),
    ultimoArqueo: ultimo ? { fecha: ultimo.fecha, dias: diferenciaDiasUTC(hoy, ultimo.fecha) } : null,
  };
}

/** Registra un ajuste manual de caja (saldo inicial, arqueo, retiro/aporte). */
export async function crearAjusteCaja(
  input: { fecha: string; monto: number; motivo: string; caja?: Caja },
  creadoPor: string
) {
  return prisma.$transaction(async (tx) => {
    const ajuste = await tx.ajusteCaja.create({
      data: {
        fecha: new Date(input.fecha),
        monto: new Prisma.Decimal(input.monto),
        motivo: input.motivo,
        caja: input.caja ?? "efectivo",
        createdById: creadoPor,
      },
    });
    await registrarAuditLog(tx, {
      tabla: "ajustes_caja",
      registroId: ajuste.id,
      accion: "create",
      campoDespues: { monto: input.monto, motivo: input.motivo, caja: ajuste.caja },
      usuarioId: creadoPor,
    });
    return ajuste;
  });
}

/**
 * Arqueo: el dueño cuenta cuánto hay de verdad en efectivo y en el banco y la app crea un ajuste
 * por la diferencia en cada caja. Si no hay diferencias deja igual un registro en 0 para saber
 * que el conteo se hizo.
 */
export async function crearArqueo(
  input: { fecha: string; efectivo: number; banco: number },
  creadoPor: string
) {
  const actual = sumarSaldos(await obtenerFlujoCaja());
  const fechaTxt = input.fecha.split("-").reverse().join("-");

  const filas = [
    { caja: "efectivo" as Caja, nombre: "efectivo contado", real: input.efectivo, sistema: actual.efectivo },
    { caja: "banco" as Caja, nombre: "saldo del banco", real: input.banco, sistema: actual.banco },
  ].map((f) => ({ ...f, diferencia: redondear2(f.real - f.sistema) }));

  return prisma.$transaction(async (tx) => {
    const aCrear = filas
      .filter((f) => f.diferencia !== 0)
      .map((f) => ({
        caja: f.caja,
        monto: f.diferencia,
        motivo: `${PREFIJO_ARQUEO} del ${fechaTxt}: ${f.nombre} ${formatCLP(f.real)} (el sistema decía ${formatCLP(f.sistema)})`,
      }));
    if (aCrear.length === 0) {
      aCrear.push({
        caja: "efectivo",
        monto: 0,
        motivo: `${PREFIJO_ARQUEO} del ${fechaTxt}: sin diferencias (efectivo ${formatCLP(input.efectivo)}, banco ${formatCLP(input.banco)})`,
      });
    }

    const ajustes = [];
    for (const a of aCrear) {
      const ajuste = await tx.ajusteCaja.create({
        data: {
          fecha: new Date(input.fecha),
          monto: new Prisma.Decimal(a.monto),
          motivo: a.motivo,
          caja: a.caja,
          createdById: creadoPor,
        },
      });
      await registrarAuditLog(tx, {
        tabla: "ajustes_caja",
        registroId: ajuste.id,
        accion: "create",
        campoDespues: { monto: a.monto, motivo: a.motivo, caja: a.caja },
        usuarioId: creadoPor,
      });
      ajustes.push(ajuste);
    }
    return { antes: actual, ajustes };
  });
}
