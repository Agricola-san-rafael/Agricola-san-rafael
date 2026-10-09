import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { diferenciaDiasUTC, sumarDiasUTC } from "@/modules/shared/dates";
import { repartirCobros as repartirPagos, separarAbonos } from "@/modules/cobros/estado-pago";

export interface DeudaProveedor {
  proveedorId: string;
  nombre: string;
  telefono: string | null;
  facturaConIva: boolean;
  saldo: number;
  hasta30: number;
  de31a60: number;
  mas60: number;
  diasDeudaMasAntigua: number;
}

export interface ResumenPorPagar {
  proveedores: DeudaProveedor[];
  total: number;
  hasta30: number;
  de31a60: number;
  mas60: number;
}

interface CompraPendiente {
  id: string;
  proveedorId: string;
  proveedor: string;
  telefono: string | null;
  facturaConIva: boolean;
  plazoPagoDias: number | null;
  nFactura: string | null;
  fecha: Date;
  total: Prisma.Decimal;
  pendiente: Prisma.Decimal;
}

/**
 * Cada compra con lo que falta pagar de ella. Lo pagado a un proveedor se aplica
 * a sus compras más antiguas primero; solo se devuelven las que aún tienen saldo.
 */
async function cargarComprasPendientes(): Promise<CompraPendiente[]> {
  const [compras, pagos] = await Promise.all([
    prisma.compra.findMany({
      orderBy: [{ fecha: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        proveedorId: true,
        fecha: true,
        total: true,
        nFactura: true,
        proveedor: { select: { nombre: true, telefono: true, facturaConIva: true, plazoPagoDias: true } },
      },
    }),
    prisma.movimientoPago.findMany({ select: { proveedorId: true, compraId: true, monto: true } }),
  ]);

  const pagosPorProveedor = new Map<string, typeof pagos>();
  for (const p of pagos) {
    const lista = pagosPorProveedor.get(p.proveedorId) ?? [];
    lista.push(p);
    pagosPorProveedor.set(p.proveedorId, lista);
  }
  const comprasPorProveedor = new Map<string, typeof compras>();
  for (const c of compras) {
    const lista = comprasPorProveedor.get(c.proveedorId) ?? [];
    lista.push(c);
    comprasPorProveedor.set(c.proveedorId, lista);
  }

  const pendientes: CompraPendiente[] = [];
  for (const [proveedorId, lista] of comprasPorProveedor) {
    const { abonadoPorVenta, libre } = separarAbonos(
      (pagosPorProveedor.get(proveedorId) ?? []).map((p) => ({ monto: p.monto, ventaId: p.compraId })),
      new Set(lista.map((c) => c.id)),
    );
    for (const { venta: compra, pendiente } of repartirPagos(lista, libre, abonadoPorVenta)) {
      if (!pendiente.gt(0)) continue;
      pendientes.push({
        id: compra.id,
        proveedorId,
        proveedor: compra.proveedor.nombre,
        telefono: compra.proveedor.telefono,
        facturaConIva: compra.proveedor.facturaConIva,
        plazoPagoDias: compra.proveedor.plazoPagoDias,
        nFactura: compra.nFactura,
        fecha: compra.fecha,
        total: compra.total,
        pendiente,
      });
    }
  }
  return pendientes;
}

/**
 * Lo que se debe a cada proveedor, separado por antigüedad (días desde la fecha
 * de la compra). Lo pagado se aplica a las compras más antiguas primero.
 */
export async function obtenerPorPagar(hoy: Date = new Date()): Promise<ResumenPorPagar> {
  const porProveedor = new Map<string, DeudaProveedor>();
  for (const compra of await cargarComprasPendientes()) {
    const deuda = porProveedor.get(compra.proveedorId) ?? {
      proveedorId: compra.proveedorId,
      nombre: compra.proveedor,
      telefono: compra.telefono,
      facturaConIva: compra.facturaConIva,
      saldo: 0,
      hasta30: 0,
      de31a60: 0,
      mas60: 0,
      diasDeudaMasAntigua: 0,
    };
    const monto = compra.pendiente.toNumber();
    const dias = diferenciaDiasUTC(hoy, compra.fecha);
    deuda.saldo += monto;
    if (dias <= 30) deuda.hasta30 += monto;
    else if (dias <= 60) deuda.de31a60 += monto;
    else deuda.mas60 += monto;
    deuda.diasDeudaMasAntigua = Math.max(deuda.diasDeudaMasAntigua, dias);
    porProveedor.set(compra.proveedorId, deuda);
  }

  const proveedores = [...porProveedor.values()].sort((a, b) => b.saldo - a.saldo);
  const suma = (campo: "saldo" | "hasta30" | "de31a60" | "mas60") =>
    proveedores.reduce((acc, p) => acc + p[campo], 0);

  return {
    proveedores,
    total: suma("saldo"),
    hasta30: suma("hasta30"),
    de31a60: suma("de31a60"),
    mas60: suma("mas60"),
  };
}

export interface FacturaPorPagar {
  proveedorId: string;
  proveedor: string;
  /** Número de la factura; null si la compra se registró sin él (entonces cada compra va por separado). */
  nFactura: string | null;
  /** Una de las compras de la factura (la más antigua); sirve de identificador estable para las alertas. */
  compraId: string;
  fecha: Date;
  /** Fecha de compra + plazo del proveedor; null si el proveedor no tiene plazo definido. */
  vencimiento: Date | null;
  /** Días que faltan para vencer (negativo = ya venció); null si no hay plazo. */
  diasParaVencer: number | null;
  total: number;
  pendiente: number;
  lineas: number;
}

/**
 * Lo que falta pagar, agrupado por factura (una factura de Betta puede tener varias
 * líneas, cada una registrada como su propia compra). Ordenado por vencimiento: primero
 * lo que vence antes o ya venció; al final lo que no tiene plazo definido.
 */
export async function obtenerFacturasPorPagar(hoy: Date = new Date()): Promise<FacturaPorPagar[]> {
  const grupos = new Map<string, FacturaPorPagar>();
  for (const compra of await cargarComprasPendientes()) {
    const nFactura = compra.nFactura?.trim() || null;
    const clave = `${compra.proveedorId}|${nFactura ?? `compra:${compra.id}`}`;
    const existente = grupos.get(clave);
    if (existente) {
      existente.total += compra.total.toNumber();
      existente.pendiente += compra.pendiente.toNumber();
      existente.lineas += 1;
      continue;
    }
    const vencimiento = compra.plazoPagoDias === null ? null : sumarDiasUTC(compra.fecha, compra.plazoPagoDias);
    grupos.set(clave, {
      proveedorId: compra.proveedorId,
      proveedor: compra.proveedor,
      nFactura,
      compraId: compra.id,
      fecha: compra.fecha,
      vencimiento,
      diasParaVencer: vencimiento ? diferenciaDiasUTC(vencimiento, hoy) : null,
      total: compra.total.toNumber(),
      pendiente: compra.pendiente.toNumber(),
      lineas: 1,
    });
  }

  return [...grupos.values()].sort((a, b) => {
    if (a.vencimiento && b.vencimiento) return a.vencimiento.getTime() - b.vencimiento.getTime();
    if (a.vencimiento) return -1;
    if (b.vencimiento) return 1;
    return a.fecha.getTime() - b.fecha.getTime();
  });
}
