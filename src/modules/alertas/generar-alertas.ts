import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { diferenciaDiasUTC, medianocheUTC, sumarDiasUTC } from "@/modules/shared/dates";
import { obtenerPorCobrar } from "@/modules/cobros/por-cobrar";
import { formatCLP } from "@/modules/shared/money";
import { debeAvisarAtraso } from "./atrasos";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Genera las alertas mínimas de la sección 5.4: X días antes del
 * vencimiento de CxC/CxP, el día en que vence, y gastos pendientes por más
 * de N días. Idempotente vía @@unique([tipo, entidadTipo, entidadId,
 * fechaDisparo]) + skipDuplicates — correr esto dos veces el mismo día no
 * duplica alertas.
 */
export async function generarAlertas(fechaReferencia: Date = new Date()) {
  const hoy = medianocheUTC(fechaReferencia);
  const alertas: Prisma.AlertaCreateManyInput[] = [];

  const ventasCredito = await prisma.venta.findMany({
    where: { formaPago: "credito", estadoPago: { not: "pagado" } },
    include: { cliente: true },
  });
  for (const venta of ventasCredito) {
    const plazo = venta.cliente.plazoPagoDias ?? 0;
    const fechaVencimiento = sumarDiasUTC(venta.fecha, plazo);
    const dias = diferenciaDiasUTC(fechaVencimiento, hoy);

    if (dias === env.ALERTA_DIAS_ANTICIPACION) {
      alertas.push({
        tipo: "cxc_vencimiento",
        entidadTipo: "venta",
        entidadId: venta.id,
        fechaDisparo: hoy,
        canal: "push",
        mensaje: `La venta a ${venta.cliente.nombre} (${venta.id.slice(0, 8)}) vence en ${dias} días`,
      });
    } else if (dias === 0) {
      alertas.push({
        tipo: "cxc_vencimiento",
        entidadTipo: "venta",
        entidadId: venta.id,
        fechaDisparo: hoy,
        canal: "push",
        mensaje: `La venta a ${venta.cliente.nombre} (${venta.id.slice(0, 8)}) vence hoy`,
      });
    }
  }

  const comprasCredito = await prisma.compra.findMany({
    where: { formaPago: "credito", estadoPago: { not: "pagado" } },
    include: { proveedor: true },
  });
  for (const compra of comprasCredito) {
    const plazo = compra.proveedor.plazoPagoDias ?? 0;
    const fechaVencimiento = sumarDiasUTC(compra.fecha, plazo);
    const dias = diferenciaDiasUTC(fechaVencimiento, hoy);

    if (dias === env.ALERTA_DIAS_ANTICIPACION) {
      alertas.push({
        tipo: "cxp_vencimiento",
        entidadTipo: "compra",
        entidadId: compra.id,
        fechaDisparo: hoy,
        canal: "push",
        mensaje: `El pago a ${compra.proveedor.nombre} (${compra.id.slice(0, 8)}) vence en ${dias} días`,
      });
    } else if (dias === 0) {
      alertas.push({
        tipo: "cxp_vencimiento",
        entidadTipo: "compra",
        entidadId: compra.id,
        fechaDisparo: hoy,
        canal: "push",
        mensaje: `El pago a ${compra.proveedor.nombre} (${compra.id.slice(0, 8)}) vence hoy`,
      });
    }
  }

  const gastosPendientes = await prisma.gastoOperacional.findMany({
    where: { estadoPago: "pendiente" },
  });
  for (const gasto of gastosPendientes) {
    const dias = diferenciaDiasUTC(hoy, gasto.fecha);
    if (dias === env.ALERTA_DIAS_GASTO_PENDIENTE) {
      alertas.push({
        tipo: "gasto_pendiente",
        entidadTipo: "gasto",
        entidadId: gasto.id,
        fechaDisparo: hoy,
        canal: "push",
        mensaje: `Gasto "${gasto.descripcion ?? gasto.categoria}" lleva ${dias} días pendiente`,
      });
    }
  }

  const { clientes: deudores } = await obtenerPorCobrar(hoy);
  for (const deudor of deudores) {
    if (debeAvisarAtraso(deudor.diasDeudaMasAntigua, env.ALERTA_DIAS_ATRASO_CLIENTE)) {
      alertas.push({
        tipo: "cxc_vencimiento",
        entidadTipo: "cliente",
        entidadId: deudor.clienteId,
        fechaDisparo: hoy,
        canal: "push",
        mensaje: `${deudor.nombre} lleva ${deudor.diasDeudaMasAntigua} días sin pagar (debe ${formatCLP(deudor.saldo)}). Arma el mensaje de cobro en Por cobrar.`,
      });
    }
  }

  if (alertas.length === 0) return { creadas: 0 };

  const resultado = await prisma.alerta.createMany({ data: alertas, skipDuplicates: true });
  return { creadas: resultado.count };
}
