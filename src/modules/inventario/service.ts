import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { NotFoundError, ValidationError } from "@/modules/shared/errors";
import { registrarAuditLog } from "@/modules/shared/audit";

interface LoteStockRow {
  id: string;
  kilos_disponibles: string;
}

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

/**
 * Ajuste manual de stock (botón "Ajustar stock" en Lotes): permite al admin
 * corregir kilos_disponibles sin pasar por una venta, para castigos de
 * inventario (mercadería vendida sin registrar, mermas, etc.). Queda
 * documentado en audit_log porque lotes_inventario no tiene campo de notas.
 */
export async function ajustarStockLote(
  loteId: string,
  kilosAjuste: number,
  motivo: string,
  usuarioId: string
) {
  return prisma.$transaction(async (tx) => {
    const lotesRaw = await tx.$queryRaw<LoteStockRow[]>`
      SELECT id, kilos_disponibles FROM lotes_inventario WHERE id = ${loteId} FOR UPDATE
    `;
    const lote = lotesRaw[0];
    if (!lote) throw new NotFoundError("Lote no encontrado");

    const kilosAntes = new Prisma.Decimal(lote.kilos_disponibles);
    const kilosDespues = kilosAntes.add(new Prisma.Decimal(kilosAjuste));
    if (kilosDespues.lt(0)) {
      throw new ValidationError(
        `El ajuste dejaría el lote en ${kilosDespues.toString()} kg (negativo)`
      );
    }

    const actualizado = await tx.loteInventario.update({
      where: { id: loteId },
      data: {
        kilosDisponibles: kilosDespues,
        estado: kilosDespues.lte(0) ? "agotado" : "disponible",
      },
    });

    await registrarAuditLog(tx, {
      tabla: "lotes_inventario",
      registroId: loteId,
      accion: "update",
      campoAntes: { kilosDisponibles: kilosAntes.toNumber() },
      campoDespues: { kilosDisponibles: kilosDespues.toNumber(), motivo },
      usuarioId,
    });

    return actualizado;
  });
}
