import { prisma } from "@/lib/prisma";
import { diferenciaDiasUTC } from "@/modules/shared/dates";
import { formatDateCL } from "@/modules/shared/dates";
import { formatCLP } from "@/modules/shared/money";

export interface ViajePorCobrar {
  id: string;
  fecha: Date;
  ruta: string;
  monto: number;
  dias: number;
  nFactura: string | null;
}

export interface DeudaTransporte {
  cliente: string;
  total: number;
  diasMasAntiguo: number;
  viajes: ViajePorCobrar[];
  mensaje: string;
}

export function armarMensajeCobroTransporte(cliente: string, viajes: { fecha: Date; ruta: string; monto: number; nFactura: string | null }[], total: number): string {
  const detalle = viajes
    .map((v) => `• ${formatDateCL(v.fecha)} – ${v.ruta}${v.nFactura ? ` (factura N° ${v.nFactura})` : ""}: ${formatCLP(v.monto)}`)
    .join("\n");
  return [
    `Hola ${cliente}, te escribo de Transportes San Rafael.`,
    "",
    "Te recuerdo que tienes pendiente el pago de estos fletes:",
    detalle,
    "",
    `Total a pagar: ${formatCLP(total)}`,
    "",
    "Cuando hagas el pago, por favor avísame y mándame el comprobante. ¡Gracias!",
  ].join("\n");
}

/** Viajes cobrados a terceros que todavía no se han pagado, agrupados por cliente. Monto = lo facturado (con IVA) o la tarifa. */
export async function obtenerPorCobrarTransporte(hoy: Date = new Date()): Promise<{ total: number; clientes: DeudaTransporte[] }> {
  const fletes = await prisma.flete.findMany({
    where: { tipo: "tercero", estadoCobro: "pendiente", tarifaCobrada: { not: null } },
    orderBy: { fecha: "asc" },
  });

  const porCliente = new Map<string, ViajePorCobrar[]>();
  for (const f of fletes) {
    const nombre = f.terceroNombre ?? "Sin nombre";
    const lista = porCliente.get(nombre) ?? [];
    lista.push({
      id: f.id,
      fecha: f.fecha,
      ruta: [f.origen, f.destino].filter(Boolean).join(" → ") || "Viaje",
      monto: Number(f.totalFacturado ?? f.tarifaCobrada),
      dias: diferenciaDiasUTC(hoy, f.fecha),
      nFactura: f.nFactura,
    });
    porCliente.set(nombre, lista);
  }

  const clientes = [...porCliente.entries()]
    .map(([cliente, viajes]) => {
      const total = viajes.reduce((a, v) => a + v.monto, 0);
      return { cliente, total, diasMasAntiguo: Math.max(...viajes.map((v) => v.dias)), viajes, mensaje: armarMensajeCobroTransporte(cliente, viajes, total) };
    })
    .sort((a, b) => b.total - a.total);
  return { total: clientes.reduce((a, c) => a + c.total, 0), clientes };
}
