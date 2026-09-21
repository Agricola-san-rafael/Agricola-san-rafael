import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { obtenerPorCobrar } from "@/modules/cobros/por-cobrar";
import { obtenerPorPagar } from "@/modules/pagos/por-pagar";

const TASA_IVA_INCLUIDO = 19 / 119;

export interface CierreMensual {
  mes: string;
  ventas: { cantidad: number; kilos: number; total: number; costo: number; utilidadBruta: number };
  ventasPorDocumento: { boleta: number; factura: number; sin_documento: number };
  ivaVentasEstimado: number;
  compras: { cantidad: number; kilos: number; total: number; ivaRegistrado: number };
  gastos: { total: number; porCategoria: Record<string, number> };
  cobrosDelMes: number;
  pagosDelMes: number;
  utilidadNeta: number;
  ajustesDeSaldo: { cantidad: number; total: number };
  alDiaDeHoy: { porCobrar: number; porPagar: number; stockValorizado: number };
}

export function rangoDelMes(mes: string): { desde: Date; hasta: Date } {
  const [anio, m] = mes.split("-").map(Number);
  return { desde: new Date(Date.UTC(anio, m - 1, 1)), hasta: new Date(Date.UTC(anio, m, 0)) };
}

export function mesValido(mes: string | undefined): mes is string {
  return !!mes && /^\d{4}-(0[1-9]|1[0-2])$/.test(mes);
}

const n = (x: unknown) => Number(x ?? 0);

async function cargarDatos(mes: string) {
  const { desde, hasta } = rangoDelMes(mes);
  const fecha = { gte: desde, lte: hasta };
  const [ventas, compras, gastos, cobros, pagos] = await Promise.all([
    prisma.venta.findMany({
      where: { fecha },
      orderBy: { fecha: "asc" },
      include: { cliente: { select: { nombre: true } }, variedad: { select: { nombre: true } }, calibre: { select: { codigo: true } } },
    }),
    prisma.compra.findMany({
      where: { fecha },
      orderBy: { fecha: "asc" },
      include: { proveedor: { select: { nombre: true } }, variedad: { select: { nombre: true } }, calibre: { select: { codigo: true } } },
    }),
    prisma.gastoOperacional.findMany({ where: { fecha }, orderBy: { fecha: "asc" } }),
    prisma.movimientoCobro.findMany({ where: { fecha }, orderBy: { fecha: "asc" }, include: { cliente: { select: { nombre: true } } } }),
    prisma.movimientoPago.findMany({ where: { fecha }, orderBy: { fecha: "asc" }, include: { proveedor: { select: { nombre: true } } } }),
  ]);
  return { ventas, compras, gastos, cobros, pagos };
}

export async function obtenerCierreMensual(mes: string): Promise<CierreMensual> {
  const { ventas, compras, gastos, cobros, pagos } = await cargarDatos(mes);
  const [porCobrar, porPagar, lotes] = await Promise.all([
    obtenerPorCobrar(),
    obtenerPorPagar(),
    prisma.loteInventario.findMany({ where: { kilosDisponibles: { gt: 0 } }, select: { kilosDisponibles: true, costoKg: true } }),
  ]);

  const reales = ventas.filter((v) => !v.esAjuste);
  const ajustes = ventas.filter((v) => v.esAjuste);
  const porDoc = { boleta: 0, factura: 0, sin_documento: 0 };
  let ventasTotal = 0, costo = 0, kilos = 0;
  for (const v of reales) {
    ventasTotal += n(v.total);
    costo += n(v.costoTotal);
    kilos += n(v.kilos);
    porDoc[v.tipoDocumento] += n(v.total);
  }

  const porCategoria: Record<string, number> = {};
  let gastosTotal = 0;
  for (const g of gastos) {
    porCategoria[g.categoria] = (porCategoria[g.categoria] ?? 0) + n(g.monto);
    gastosTotal += n(g.monto);
  }

  const utilidadBruta = ventasTotal - costo;
  return {
    mes,
    ventas: { cantidad: reales.length, kilos, total: ventasTotal, costo, utilidadBruta },
    ventasPorDocumento: porDoc,
    ivaVentasEstimado: (porDoc.boleta + porDoc.factura) * TASA_IVA_INCLUIDO,
    compras: {
      cantidad: compras.length,
      kilos: compras.reduce((a, c) => a + n(c.kilos), 0),
      total: compras.reduce((a, c) => a + n(c.total), 0),
      ivaRegistrado: compras.reduce((a, c) => a + n(c.iva), 0),
    },
    gastos: { total: gastosTotal, porCategoria },
    cobrosDelMes: cobros.reduce((a, c) => a + n(c.monto), 0),
    pagosDelMes: pagos.reduce((a, p) => a + n(p.monto), 0),
    utilidadNeta: utilidadBruta - gastosTotal,
    ajustesDeSaldo: { cantidad: ajustes.length, total: ajustes.reduce((a, v) => a + n(v.total), 0) },
    alDiaDeHoy: {
      porCobrar: porCobrar.total,
      porPagar: porPagar.total,
      stockValorizado: lotes.reduce((a, l) => a + n(l.kilosDisponibles) * n(l.costoKg), 0),
    },
  };
}

const CLP = '"$"#,##0';

function estiloEncabezado(hoja: ExcelJS.Worksheet) {
  const fila = hoja.getRow(1);
  fila.font = { bold: true };
  fila.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9EAD3" } };
  hoja.views = [{ state: "frozen", ySplit: 1 }];
}

function agregarHoja(libro: ExcelJS.Workbook, nombre: string, columnas: { header: string; key: string; width: number; clp?: boolean }[], filas: Record<string, unknown>[]) {
  const hoja = libro.addWorksheet(nombre);
  hoja.columns = columnas.map((c) => ({ header: c.header, key: c.key, width: c.width, style: c.clp ? { numFmt: CLP } : {} }));
  filas.forEach((f) => hoja.addRow(f));
  estiloEncabezado(hoja);
  return hoja;
}

const dia = (d: Date) => d.toISOString().slice(0, 10);

/** Genera el Excel del cierre del mes: resumen y el detalle de ventas, compras, gastos, cobros y pagos. */
export async function generarExcelCierre(mes: string): Promise<Buffer> {
  const [cierre, datos] = await Promise.all([obtenerCierreMensual(mes), cargarDatos(mes)]);
  const libro = new ExcelJS.Workbook();

  const resumen = libro.addWorksheet("Resumen");
  resumen.columns = [{ width: 46 }, { width: 22 }];
  const filas: [string, string | number | null][] = [
    [`Cierre mensual ${mes} - Agrícola San Rafael`, null],
    ["", null],
    ["VENTAS (sin ajustes de saldo)", null],
    ["Cantidad de ventas", cierre.ventas.cantidad],
    ["Kilos vendidos", cierre.ventas.kilos],
    ["Total vendido", cierre.ventas.total],
    ["Costo de lo vendido", cierre.ventas.costo],
    ["Utilidad bruta", cierre.ventas.utilidadBruta],
    ["  Vendido con boleta", cierre.ventasPorDocumento.boleta],
    ["  Vendido con factura", cierre.ventasPorDocumento.factura],
    ["  Vendido sin documento", cierre.ventasPorDocumento.sin_documento],
    ["", null],
    ["COMPRAS", null],
    ["Cantidad de compras", cierre.compras.cantidad],
    ["Kilos comprados", cierre.compras.kilos],
    ["Total comprado", cierre.compras.total],
    ["IVA de compras registrado (crédito fiscal)", cierre.compras.ivaRegistrado],
    ["", null],
    ["GASTOS OPERACIONALES", null],
    ...Object.entries(cierre.gastos.porCategoria).map(([c, m]) => [`  ${c}`, m] as [string, number]),
    ["Total gastos", cierre.gastos.total],
    ["", null],
    ["UTILIDAD NETA (utilidad bruta - gastos)", cierre.utilidadNeta],
    ["", null],
    ["MOVIMIENTOS DE DINERO DEL MES", null],
    ["Cobrado a clientes", cierre.cobrosDelMes],
    ["Pagado a proveedores", cierre.pagosDelMes],
    ["", null],
    ["IVA (estimado, revisar con el contador)", null],
    ["IVA de ventas con boleta o factura (precio con IVA incluido)", cierre.ivaVentasEstimado],
    ["IVA de compras registrado", cierre.compras.ivaRegistrado],
    ["", null],
    ["AJUSTES DE SALDO DEL MES (no son ventas)", cierre.ajustesDeSaldo.total],
    ["", null],
    ["SALDOS AL DÍA DE LA DESCARGA (no son del cierre)", null],
    ["Por cobrar", cierre.alDiaDeHoy.porCobrar],
    ["Por pagar", cierre.alDiaDeHoy.porPagar],
    ["Stock valorizado", cierre.alDiaDeHoy.stockValorizado],
  ];
  filas.forEach(([a, b]) => {
    const fila = resumen.addRow([a, b]);
    const titulo = b === null && a !== "";
    if (titulo) fila.font = { bold: true };
    if (typeof b === "number" && Math.abs(b) >= 1000) fila.getCell(2).numFmt = CLP;
  });
  resumen.getRow(1).font = { bold: true, size: 14 };

  agregarHoja(libro, "Ventas", [
    { header: "Fecha", key: "fecha", width: 12 }, { header: "Cliente", key: "cliente", width: 34 },
    { header: "Producto", key: "producto", width: 26 }, { header: "Kilos", key: "kilos", width: 10 },
    { header: "Precio/kg", key: "precio", width: 12, clp: true }, { header: "Total", key: "total", width: 14, clp: true },
    { header: "Costo", key: "costo", width: 14, clp: true }, { header: "Utilidad", key: "utilidad", width: 14, clp: true },
    { header: "Forma de pago", key: "forma", width: 14 }, { header: "Estado", key: "estado", width: 12 },
    { header: "Documento", key: "doc", width: 14 }, { header: "N° documento", key: "ndoc", width: 14 },
    { header: "Ajuste de saldo", key: "ajuste", width: 14 },
  ], datos.ventas.map((v) => ({
    fecha: dia(v.fecha), cliente: v.cliente.nombre, producto: `${v.variedad.nombre} ${v.calibre.codigo}`,
    kilos: n(v.kilos), precio: n(v.precioKg), total: n(v.total), costo: n(v.costoTotal), utilidad: n(v.margen),
    forma: v.formaPago, estado: v.estadoPago, doc: v.tipoDocumento, ndoc: v.nDocumento ?? "", ajuste: v.esAjuste ? "sí" : "",
  })));

  agregarHoja(libro, "Compras", [
    { header: "Fecha", key: "fecha", width: 12 }, { header: "Proveedor", key: "proveedor", width: 34 },
    { header: "Producto", key: "producto", width: 26 }, { header: "Kilos", key: "kilos", width: 10 },
    { header: "Precio/kg", key: "precio", width: 12, clp: true }, { header: "Total", key: "total", width: 14, clp: true },
    { header: "Neto", key: "neto", width: 14, clp: true }, { header: "IVA", key: "iva", width: 14, clp: true },
    { header: "N° factura", key: "factura", width: 14 }, { header: "Forma de pago", key: "forma", width: 14 },
    { header: "Estado", key: "estado", width: 12 },
  ], datos.compras.map((c) => ({
    fecha: dia(c.fecha), proveedor: c.proveedor.nombre, producto: `${c.variedad.nombre} ${c.calibre.codigo}`,
    kilos: n(c.kilos), precio: n(c.precioKg), total: n(c.total), neto: c.neto ? n(c.neto) : null, iva: c.iva ? n(c.iva) : null,
    factura: c.nFactura ?? "", forma: c.formaPago, estado: c.estadoPago,
  })));

  agregarHoja(libro, "Gastos", [
    { header: "Fecha", key: "fecha", width: 12 }, { header: "Categoría", key: "categoria", width: 16 },
    { header: "Descripción", key: "descripcion", width: 40 }, { header: "Pagado a", key: "pagadoA", width: 26 },
    { header: "Monto", key: "monto", width: 14, clp: true }, { header: "Forma de pago", key: "forma", width: 14 },
    { header: "Estado", key: "estado", width: 12 },
  ], datos.gastos.map((g) => ({
    fecha: dia(g.fecha), categoria: g.categoria, descripcion: g.descripcion ?? "", pagadoA: g.pagadoA ?? "",
    monto: n(g.monto), forma: g.formaPago, estado: g.estadoPago,
  })));

  agregarHoja(libro, "Cobros", [
    { header: "Fecha", key: "fecha", width: 12 }, { header: "Cliente", key: "cliente", width: 34 },
    { header: "Monto", key: "monto", width: 14, clp: true }, { header: "Medio", key: "medio", width: 20 },
    { header: "Referencia", key: "ref", width: 70 },
  ], datos.cobros.map((c) => ({ fecha: dia(c.fecha), cliente: c.cliente.nombre, monto: n(c.monto), medio: c.medioPago, ref: c.referencia ?? "" })));

  agregarHoja(libro, "Pagos", [
    { header: "Fecha", key: "fecha", width: 12 }, { header: "Proveedor", key: "proveedor", width: 34 },
    { header: "Monto", key: "monto", width: 14, clp: true }, { header: "Medio", key: "medio", width: 20 },
    { header: "Referencia", key: "ref", width: 70 },
  ], datos.pagos.map((p) => ({ fecha: dia(p.fecha), proveedor: p.proveedor.nombre, monto: n(p.monto), medio: p.medioPago, ref: p.referencia ?? "" })));

  return Buffer.from(await libro.xlsx.writeBuffer());
}
