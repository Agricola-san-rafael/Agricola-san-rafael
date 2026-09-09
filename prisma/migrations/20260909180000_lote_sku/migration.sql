-- Reemplaza el consumo automático FIFO por selección manual de lote por SKU
-- (decisión del usuario 09-09-2026): cada lote necesita un código único y
-- legible para poder elegirlo explícitamente al registrar una venta.

ALTER TABLE "lotes_inventario" ADD COLUMN "sku" TEXT;

CREATE SEQUENCE IF NOT EXISTS lote_sku_seq;

-- Backfill de lotes existentes en orden de ingreso, para preservar un
-- correlativo legible (LOTE-0001, LOTE-0002, ...).
DO $$
DECLARE
  rec RECORD;
  contador INT := 1;
BEGIN
  FOR rec IN SELECT id FROM lotes_inventario ORDER BY fecha_ingreso ASC, id ASC LOOP
    UPDATE lotes_inventario SET sku = 'LOTE-' || LPAD(contador::text, 4, '0') WHERE id = rec.id;
    contador := contador + 1;
  END LOOP;
  PERFORM setval('lote_sku_seq', contador - 1, true);
END $$;

ALTER TABLE "lotes_inventario" ALTER COLUMN "sku" SET NOT NULL;
CREATE UNIQUE INDEX "lotes_inventario_sku_key" ON "lotes_inventario"("sku");
