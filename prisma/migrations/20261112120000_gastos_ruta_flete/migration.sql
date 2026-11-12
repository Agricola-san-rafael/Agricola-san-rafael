-- AlterTable
ALTER TABLE "fletes" ADD COLUMN "costo_gastos_ruta" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "gastos_ruta_flete" (
    "id" TEXT NOT NULL,
    "flete_id" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "gastos_ruta_flete_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gastos_ruta_flete_flete_id_idx" ON "gastos_ruta_flete"("flete_id");

-- AddForeignKey
ALTER TABLE "gastos_ruta_flete" ADD CONSTRAINT "gastos_ruta_flete_flete_id_fkey" FOREIGN KEY ("flete_id") REFERENCES "fletes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
