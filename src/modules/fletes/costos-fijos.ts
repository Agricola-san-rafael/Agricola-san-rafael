import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { registrarAuditLog } from "@/modules/shared/audit";

/** Día en que vence el costo este mes; si el mes es más corto (ej. día 31 en septiembre), el último día. */
export function fechaDeVencimiento(anio: number, mes: number, dia: number): Date {
  const ultimo = new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate();
  return new Date(Date.UTC(anio, mes, Math.min(dia, ultimo)));
}

/** Toca generar el gasto del mes si ya llegó el día, el costo ya empezó y todavía no se creó este mes. */
export function debeGenerarseHoy(params: { hoy: Date; diaDelMes: number; desde: Date; yaGeneradoEsteMes: boolean }): boolean {
  if (params.yaGeneradoEsteMes) return false;
  const vence = fechaDeVencimiento(params.hoy.getUTCFullYear(), params.hoy.getUTCMonth(), params.diaDelMes);
  return params.hoy.getTime() >= vence.getTime() && params.hoy.getTime() >= params.desde.getTime();
}

/** Crea los gastos de los costos fijos que vencen hoy (o que vencieron este mes y aún no se crearon). */
export async function generarCostosFijosDelDia(hoyReal: Date = new Date()) {
  const hoy = new Date(Date.UTC(hoyReal.getUTCFullYear(), hoyReal.getUTCMonth(), hoyReal.getUTCDate()));
  const inicioMes = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), 1));
  const finMes = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() + 1, 0));

  const costos = await prisma.costoFijoRecurrente.findMany({ where: { activo: true } });
  let creados = 0;
  for (const c of costos) {
    const yaGenerado = (await prisma.gastoOperacional.count({ where: { costoFijoId: c.id, fecha: { gte: inicioMes, lte: finMes } } })) > 0;
    if (!debeGenerarseHoy({ hoy, diaDelMes: c.diaDelMes, desde: c.desde, yaGeneradoEsteMes: yaGenerado })) continue;

    const fecha = fechaDeVencimiento(hoy.getUTCFullYear(), hoy.getUTCMonth(), c.diaDelMes);
    await prisma.$transaction(async (tx) => {
      const gasto = await tx.gastoOperacional.create({
        data: {
          fecha,
          categoria: c.categoria,
          descripcion: `${c.concepto} (costo fijo mensual)`,
          monto: c.monto,
          formaPago: "transferencia",
          estadoPago: "pagado",
          empresa: c.empresa,
          costoFijoId: c.id,
        },
      });
      if (c.pagadoPorAgricola) {
        await tx.movimientoEntreEmpresas.create({
          data: { fecha, monto: c.monto, concepto: `${c.concepto} pagado desde la cuenta de la agrícola`, referencia: "Costo fijo mensual" },
        });
      }
      await registrarAuditLog(tx, {
        tabla: "gastos_operacionales",
        registroId: gasto.id,
        accion: "create",
        campoDespues: { origen: "costo fijo recurrente", concepto: c.concepto, monto: Number(c.monto) },
      });
    });
    creados++;
  }
  return { creados };
}

export async function totalCostosFijosMensuales(empresa: "agricola" | "transporte" = "transporte") {
  const r = await prisma.costoFijoRecurrente.aggregate({ where: { activo: true, empresa }, _sum: { monto: true } });
  return Number(r._sum.monto ?? new Prisma.Decimal(0));
}
