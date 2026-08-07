import { prisma } from "@/lib/prisma";

interface StockRow {
  variedad_id: string;
  calibre_id: string;
  stock_kg: string;
}

export interface StockActual {
  variedadId: string;
  variedadNombre: string;
  calibreId: string;
  calibreCodigo: string;
  stockKg: number;
}

/** Stock agregado por variedad/calibre (sección 6: GET /inventario/stock), desde la vista SQL. */
export async function obtenerStockActual(): Promise<StockActual[]> {
  const rows = await prisma.$queryRaw<StockRow[]>`
    SELECT variedad_id, calibre_id, stock_kg FROM vista_stock_actual
  `;

  const [variedades, calibres] = await Promise.all([
    prisma.variedad.findMany(),
    prisma.calibre.findMany(),
  ]);
  const variedadPorId = new Map(variedades.map((v) => [v.id, v.nombre]));
  const calibrePorId = new Map(calibres.map((c) => [c.id, c.codigo]));

  return rows
    .map((r) => ({
      variedadId: r.variedad_id,
      variedadNombre: variedadPorId.get(r.variedad_id) ?? "—",
      calibreId: r.calibre_id,
      calibreCodigo: calibrePorId.get(r.calibre_id) ?? "—",
      stockKg: Number(r.stock_kg),
    }))
    .filter((r) => r.stockKg > 0)
    .sort((a, b) => a.variedadNombre.localeCompare(b.variedadNombre));
}

/** Detalle de lotes con kilos_disponibles > 0 (sección 6: GET /inventario/lotes). */
export async function obtenerLotesDisponibles() {
  return prisma.loteInventario.findMany({
    where: { kilosDisponibles: { gt: 0 } },
    include: { variedad: true, calibre: true, compra: { include: { proveedor: true } } },
    orderBy: { fechaIngreso: "asc" },
  });
}
