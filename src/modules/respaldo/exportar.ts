import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { registrarAuditLog } from "@/modules/shared/audit";

const CAMPOS_SECRETOS = new Set(["passwordHash", "tokenHash"]);

type Fila = Record<string, unknown>;

/** Deja una fila lista para Excel: números en vez de Decimal, fechas en texto, sin campos secretos. */
export function aplanarFila(fila: Fila): Record<string, string | number | boolean | null> {
  const salida: Record<string, string | number | boolean | null> = {};
  for (const [clave, valor] of Object.entries(fila)) {
    if (CAMPOS_SECRETOS.has(clave)) continue;
    if (valor === null || valor === undefined) salida[clave] = null;
    else if (valor instanceof Date) salida[clave] = valor.toISOString();
    else if (typeof valor === "object" && "toNumber" in (valor as object)) salida[clave] = (valor as { toNumber: () => number }).toNumber();
    else if (typeof valor === "object") salida[clave] = JSON.stringify(valor);
    else salida[clave] = valor as string | number | boolean;
  }
  return salida;
}

/** Genera un Excel con una hoja por cada tabla del negocio. No incluye contraseñas ni sesiones. */
export async function generarRespaldoCompleto(usuarioId: string): Promise<{ buffer: Buffer; filas: number; hojas: number }> {
  const tablas: [string, Promise<Fila[]>][] = [
    ["Clientes", prisma.cliente.findMany()],
    ["Proveedores", prisma.proveedor.findMany()],
    ["Variedades", prisma.variedad.findMany()],
    ["Calibres", prisma.calibre.findMany()],
    ["Compras", prisma.compra.findMany({ orderBy: { fecha: "asc" } })],
    ["Lotes", prisma.loteInventario.findMany()],
    ["Ventas", prisma.venta.findMany({ orderBy: { fecha: "asc" } })],
    ["VentaLotes", prisma.ventaLote.findMany()],
    ["Cobros", prisma.movimientoCobro.findMany({ orderBy: { fecha: "asc" } })],
    ["Pagos", prisma.movimientoPago.findMany({ orderBy: { fecha: "asc" } })],
    ["Gastos", prisma.gastoOperacional.findMany({ orderBy: { fecha: "asc" } })],
    ["Fletes", prisma.flete.findMany({ orderBy: { fecha: "asc" } })],
    ["PrestamoEntreEmpresas", prisma.movimientoEntreEmpresas.findMany({ orderBy: { fecha: "asc" } })],
    ["TiposCaja", prisma.tipoCaja.findMany()],
    ["Alertas", prisma.alerta.findMany()],
    ["Usuarios", prisma.usuario.findMany()],
    ["Auditoria", prisma.auditLog.findMany({ orderBy: { createdAt: "asc" } })],
  ];

  const libro = new ExcelJS.Workbook();
  let totalFilas = 0;
  const resumen = libro.addWorksheet("Resumen");
  resumen.columns = [{ header: "Tabla", key: "tabla", width: 28 }, { header: "Filas", key: "filas", width: 10 }];
  resumen.getRow(1).font = { bold: true };

  for (const [nombre, consulta] of tablas) {
    const filas = (await consulta).map((f) => aplanarFila(f));
    const hoja = libro.addWorksheet(nombre);
    const columnas = [...new Set(filas.flatMap((f) => Object.keys(f)))];
    hoja.columns = columnas.map((c) => ({ header: c, key: c, width: Math.min(40, Math.max(12, c.length + 2)) }));
    filas.forEach((f) => hoja.addRow(f));
    hoja.getRow(1).font = { bold: true };
    hoja.views = [{ state: "frozen", ySplit: 1 }];
    resumen.addRow({ tabla: nombre, filas: filas.length });
    totalFilas += filas.length;
  }
  resumen.addRow({});
  resumen.addRow({ tabla: `Respaldo generado el ${new Date().toISOString()}` });

  await registrarAuditLog(prisma, {
    tabla: "respaldo",
    registroId: "respaldo-completo",
    accion: "create",
    campoDespues: { filas: totalFilas, tablas: tablas.length },
    usuarioId,
  });

  return { buffer: Buffer.from(await libro.xlsx.writeBuffer()), filas: totalFilas, hojas: tablas.length };
}
