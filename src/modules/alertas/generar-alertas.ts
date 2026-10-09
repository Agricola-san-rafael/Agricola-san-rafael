import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { diferenciaDiasUTC, formatDateCL, medianocheUTC, sumarDiasUTC } from "@/modules/shared/dates";
import { obtenerPorCobrar } from "@/modules/cobros/por-cobrar";
import { obtenerFacturasPorPagar } from "@/modules/pagos/por-pagar";
import { evaluarCredito } from "@/modules/clientes/credito";
import { formatCLP } from "@/modules/shared/money";
import { debeAvisarAtraso } from "./atrasos";
import { avisoVencimiento } from "./vencimientos";
import type { Prisma } from "@/generated/prisma/client";

/** Cada cuántos días se repite el aviso de un cliente que sigue pasado de su límite de crédito. */
const DIAS_ENTRE_AVISOS_CREDITO = 7;

/**
 * Genera las alertas mínimas de la sección 5.4: X días antes del
 * vencimiento de CxC, el día en que vence, y gastos pendientes por más
 * de N días. Las facturas de proveedores se avisan una sola vez por factura (no por línea):
 * antes de vencer, el día que vence y cada pocos días mientras sigan sin pagarse.
 * También avisa cada semana de los clientes que deben más que su límite de crédito. Idempotente vía @@unique([tipo, entidadTipo, entidadId,
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

  const facturas = await obtenerFacturasPorPagar(hoy);
  for (const factura of facturas) {
    if (factura.diasParaVencer === null) continue;
    const aviso = avisoVencimiento(factura.diasParaVencer, env.ALERTA_DIAS_ANTICIPACION, env.ALERTA_DIAS_RECORDATORIO_FACTURA);
    if (!aviso || !factura.vencimiento) continue;

    const nombre = factura.nFactura
      ? `La factura ${factura.nFactura} de ${factura.proveedor}`
      : `La compra del ${formatDateCL(factura.fecha)} a ${factura.proveedor}`;
    const debe = `Falta pagar ${formatCLP(factura.pendiente)}.`;
    const mensaje =
      aviso.tipo === "anticipo"
        ? `${nombre} vence en ${aviso.dias} días (${formatDateCL(factura.vencimiento)}). ${debe}`
        : aviso.tipo === "hoy"
          ? `${nombre} vence hoy. ${debe}`
          : `${nombre} lleva ${aviso.diasAtraso} ${aviso.diasAtraso === 1 ? "día vencida" : "días vencida"} (venció el ${formatDateCL(factura.vencimiento)}). ${debe}`;

    alertas.push({
      tipo: "cxp_vencimiento",
      entidadTipo: "compra",
      entidadId: factura.compraId,
      fechaDisparo: hoy,
      canal: "push",
      mensaje,
    });
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

  const conLimite = await prisma.cliente.findMany({
    where: { limiteCredito: { not: null } },
    select: { id: true, limiteCredito: true },
  });
  if (conLimite.length > 0) {
    const limites = new Map(conLimite.map((c) => [c.id, c.limiteCredito as number]));
    const avisados = new Set(
      (
        await prisma.alerta.findMany({
          where: {
            tipo: "credito_excedido",
            entidadTipo: "cliente",
            fechaDisparo: { gt: sumarDiasUTC(hoy, -DIAS_ENTRE_AVISOS_CREDITO) },
          },
          select: { entidadId: true },
        })
      ).map((a) => a.entidadId),
    );
    for (const deudor of deudores) {
      const limite = limites.get(deudor.clienteId);
      if (limite === undefined || avisados.has(deudor.clienteId)) continue;
      const { sobreLimite, exceso } = evaluarCredito({
        saldo: deudor.saldo,
        limite,
        ventaNueva: 0,
        diasDeudaMasAntigua: deudor.diasDeudaMasAntigua,
        plazoDias: 0,
      });
      if (!sobreLimite) continue;
      alertas.push({
        tipo: "credito_excedido",
        entidadTipo: "cliente",
        entidadId: deudor.clienteId,
        fechaDisparo: hoy,
        canal: "push",
        mensaje: `${deudor.nombre} debe ${formatCLP(deudor.saldo)} y su límite de crédito es ${formatCLP(limite)} (se pasa por ${formatCLP(exceso)}).`,
      });
    }
  }

  if (alertas.length === 0) return { creadas: 0 };

  const resultado = await prisma.alerta.createMany({ data: alertas, skipDuplicates: true });
  return { creadas: resultado.count };
}
