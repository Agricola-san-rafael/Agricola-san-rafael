import { prisma } from "@/lib/prisma";
import { diferenciaDiasUTC, medianocheUTC, sumarDiasUTC } from "@/modules/shared/dates";

interface SaldoRow {
  saldo_pendiente: string;
}

export interface KPIs {
  ventasDelMes: { cantidad: number; total: number; margen: number };
  comprasDelMes: { cantidad: number; total: number };
  totalCxC: number;
  totalCxP: number;
  capitalDeTrabajo: number;
  stockValorizado: number;
}

/** Los mismos KPIs de la hoja Resumen del Excel (sección 6: GET /reportes/kpis). */
export async function obtenerKPIs(): Promise<KPIs> {
  const hoy = medianocheUTC(new Date());
  const inicioMes = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), 1));

  const [ventasMes, comprasMes, saldosClientes, saldosProveedores, lotes] = await Promise.all([
    prisma.venta.aggregate({
      where: { fecha: { gte: inicioMes } },
      _count: true,
      _sum: { total: true, margen: true },
    }),
    prisma.compra.aggregate({
      where: { fecha: { gte: inicioMes } },
      _count: true,
      _sum: { total: true },
    }),
    prisma.$queryRaw<SaldoRow[]>`SELECT saldo_pendiente FROM vista_saldo_clientes`,
    prisma.$queryRaw<SaldoRow[]>`SELECT saldo_pendiente FROM vista_saldo_proveedores`,
    prisma.loteInventario.findMany({ where: { kilosDisponibles: { gt: 0 } } }),
  ]);

  const totalCxC = saldosClientes.reduce((acc, r) => acc + Math.max(0, Number(r.saldo_pendiente)), 0);
  const totalCxP = saldosProveedores.reduce((acc, r) => acc + Math.max(0, Number(r.saldo_pendiente)), 0);
  const stockValorizado = lotes.reduce(
    (acc, l) => acc + Number(l.kilosDisponibles) * Number(l.costoKg),
    0
  );

  return {
    ventasDelMes: {
      cantidad: ventasMes._count,
      total: Number(ventasMes._sum.total ?? 0),
      margen: Number(ventasMes._sum.margen ?? 0),
    },
    comprasDelMes: {
      cantidad: comprasMes._count,
      total: Number(comprasMes._sum.total ?? 0),
    },
    totalCxC,
    totalCxP,
    capitalDeTrabajo: totalCxC - totalCxP + stockValorizado,
    stockValorizado,
  };
}

export interface RankingItem {
  id: string;
  nombre: string;
  totalKilos: number;
  totalMonto: number;
}

export interface Concentracion {
  topClientes: RankingItem[];
  topProveedores: RankingItem[];
}

/** Top clientes/proveedores por volumen (sección 6: GET /reportes/concentracion). */
export async function obtenerConcentracion(limite = 5): Promise<Concentracion> {
  const [ventas, compras] = await Promise.all([
    prisma.venta.findMany({ include: { cliente: true } }),
    prisma.compra.findMany({ include: { proveedor: true } }),
  ]);

  const porCliente = new Map<string, RankingItem>();
  for (const v of ventas) {
    const actual = porCliente.get(v.clienteId) ?? {
      id: v.clienteId,
      nombre: v.cliente.nombre,
      totalKilos: 0,
      totalMonto: 0,
    };
    actual.totalKilos += Number(v.kilos);
    actual.totalMonto += Number(v.total);
    porCliente.set(v.clienteId, actual);
  }

  const porProveedor = new Map<string, RankingItem>();
  for (const c of compras) {
    const actual = porProveedor.get(c.proveedorId) ?? {
      id: c.proveedorId,
      nombre: c.proveedor.nombre,
      totalKilos: 0,
      totalMonto: 0,
    };
    actual.totalKilos += Number(c.kilos);
    actual.totalMonto += Number(c.total);
    porProveedor.set(c.proveedorId, actual);
  }

  return {
    topClientes: [...porCliente.values()].sort((a, b) => b.totalMonto - a.totalMonto).slice(0, limite),
    topProveedores: [...porProveedor.values()]
      .sort((a, b) => b.totalMonto - a.totalMonto)
      .slice(0, limite),
  };
}

export interface CuentaVencida {
  id: string;
  tipo: "cxc" | "cxp";
  entidadNombre: string;
  fecha: Date;
  fechaVencimiento: Date;
  diasAtraso: number;
  monto: number;
}

/** Cuentas por cobrar/pagar vencidas, con antigüedad (sección 6: GET /reportes/vencidas). */
export async function obtenerVencidas(): Promise<CuentaVencida[]> {
  const hoy = medianocheUTC(new Date());

  const [ventasCredito, comprasCredito] = await Promise.all([
    prisma.venta.findMany({
      where: { formaPago: "credito", estadoPago: { not: "pagado" } },
      include: { cliente: true },
    }),
    prisma.compra.findMany({
      where: { formaPago: "credito", estadoPago: { not: "pagado" } },
      include: { proveedor: true },
    }),
  ]);

  const vencidas: CuentaVencida[] = [];

  for (const v of ventasCredito) {
    const plazo = v.cliente.plazoPagoDias ?? 0;
    const fechaVencimiento = sumarDiasUTC(v.fecha, plazo);
    const diasAtraso = diferenciaDiasUTC(hoy, fechaVencimiento);
    if (diasAtraso > 0) {
      vencidas.push({
        id: v.id,
        tipo: "cxc",
        entidadNombre: v.cliente.nombre,
        fecha: v.fecha,
        fechaVencimiento,
        diasAtraso,
        monto: Number(v.total),
      });
    }
  }

  for (const c of comprasCredito) {
    const plazo = c.proveedor.plazoPagoDias ?? 0;
    const fechaVencimiento = sumarDiasUTC(c.fecha, plazo);
    const diasAtraso = diferenciaDiasUTC(hoy, fechaVencimiento);
    if (diasAtraso > 0) {
      vencidas.push({
        id: c.id,
        tipo: "cxp",
        entidadNombre: c.proveedor.nombre,
        fecha: c.fecha,
        fechaVencimiento,
        diasAtraso,
        monto: Number(c.total),
      });
    }
  }

  return vencidas.sort((a, b) => b.diasAtraso - a.diasAtraso);
}

export interface DescalceDePlazos {
  plazoPromedioClientes: number;
  plazoPromedioProveedores: number;
  descalceDias: number;
}

/**
 * Descalce de plazos (sección 5.3 y 2.4 del informe): compara el plazo
 * promedio que el negocio otorga a sus clientes contra el que le exigen sus
 * proveedores.
 */
export async function obtenerDescalceDePlazos(): Promise<DescalceDePlazos> {
  const [clientes, proveedores] = await Promise.all([
    prisma.cliente.findMany({ where: { condicionesPago: "credito" } }),
    prisma.proveedor.findMany({ where: { condicionesPago: "credito" } }),
  ]);

  const promedio = (valores: number[]) =>
    valores.length === 0 ? 0 : valores.reduce((a, b) => a + b, 0) / valores.length;

  const plazoPromedioClientes = promedio(clientes.map((c) => c.plazoPagoDias ?? 0));
  const plazoPromedioProveedores = promedio(proveedores.map((p) => p.plazoPagoDias ?? 0));

  return {
    plazoPromedioClientes,
    plazoPromedioProveedores,
    descalceDias: plazoPromedioClientes - plazoPromedioProveedores,
  };
}
