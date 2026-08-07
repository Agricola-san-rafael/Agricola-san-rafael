import ExcelJS from "exceljs";

// Confirmado contra el archivo real (Gestion_Agricola_San_Rafael.xlsx, agosto
// 2026): todas las hojas tienen 2 filas de título/subtítulo, una fila 3 en
// blanco, y los encabezados de columna reales en la fila 4. Los datos parten
// en la fila 5.
const FILA_ENCABEZADO = 4;

/** Desenvuelve celdas de fórmula (ExcelJS las entrega como {formula, result}). */
function valorCelda(valor: ExcelJS.CellValue): unknown {
  if (valor && typeof valor === "object" && "result" in valor) {
    return (valor as { result: unknown }).result;
  }
  return valor;
}

/**
 * Lee una hoja como una lista de objetos, usando la fila de encabezados real
 * (fila 4, no la 1 — ver arriba). No asume un orden de columnas fijo — cada
 * mapper en 02-transformar.ts busca sus columnas por nombre exacto de
 * encabezado (ver `buscarColumna`), así que reordenar columnas en el Excel
 * no rompe la migración.
 */
function leerHojaComoObjetos(worksheet: ExcelJS.Worksheet): Record<string, unknown>[] {
  const encabezados: string[] = [];
  worksheet.getRow(FILA_ENCABEZADO).eachCell({ includeEmpty: true }, (cell, colNumber) => {
    encabezados[colNumber] = String(valorCelda(cell.value) ?? "").trim();
  });

  const filas: Record<string, unknown>[] = [];
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber <= FILA_ENCABEZADO) return; // títulos/subtítulo/encabezado
    const fila: Record<string, unknown> = {};
    let tieneAlgunValor = false;
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const header = encabezados[colNumber];
      if (!header) return;
      const valor = valorCelda(cell.value);
      if (valor !== null && valor !== undefined && valor !== "") tieneAlgunValor = true;
      fila[header] = valor;
    });
    if (tieneAlgunValor) filas.push(fila);
  });

  return filas;
}

export interface HojasExcel {
  proveedores: Record<string, unknown>[];
  clientes: Record<string, unknown>[];
  compras: Record<string, unknown>[];
  ventas: Record<string, unknown>[];
  flujoCaja: Record<string, unknown>[];
  gastos: Record<string, unknown>[];
  prospectos: Record<string, unknown>[];
}

const NOMBRES_HOJA = {
  proveedores: "Proveedores",
  clientes: "Clientes",
  compras: "Compras",
  ventas: "Ventas",
  flujoCaja: "Flujo de Caja",
  gastos: "Gastos Operacionales",
  prospectos: "Prospectos",
} as const;

export async function leerExcel(rutaArchivo: string): Promise<HojasExcel> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(rutaArchivo);

  const resultado: Partial<HojasExcel> = {};
  for (const [clave, nombreHoja] of Object.entries(NOMBRES_HOJA)) {
    const worksheet = workbook.getWorksheet(nombreHoja);
    if (!worksheet) {
      console.warn(`Aviso: no se encontró la hoja "${nombreHoja}" — se omite (0 filas).`);
      resultado[clave as keyof HojasExcel] = [];
      continue;
    }
    resultado[clave as keyof HojasExcel] = leerHojaComoObjetos(worksheet);
  }

  return resultado as HojasExcel;
}
