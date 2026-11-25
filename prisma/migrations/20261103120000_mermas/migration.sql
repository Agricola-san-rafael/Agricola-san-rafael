-- CreateEnum
CREATE TYPE "CausaMerma" AS ENUM ('perdida_peso', 'fruta_mala', 'error_conteo', 'regalo_muestra');

-- CreateTable
CREATE TABLE "mermas" (
    "id" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "lote_id" TEXT NOT NULL,
    "kilos" DECIMAL(10,2) NOT NULL,
    "costo_kg" DECIMAL(10,2) NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "causa" "CausaMerma" NOT NULL,
    "observaciones" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "mermas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mermas_fecha_idx" ON "mermas"("fecha");

-- CreateIndex
CREATE INDEX "mermas_lote_id_idx" ON "mermas"("lote_id");

-- AddForeignKey
ALTER TABLE "mermas" ADD CONSTRAINT "mermas_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "lotes_inventario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
