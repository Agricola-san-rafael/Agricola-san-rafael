-- CreateEnum
CREATE TYPE "TipoFlete" AS ENUM ('compra', 'venta', 'tercero');

-- CreateTable
CREATE TABLE "fletes" (
    "id" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "tipo" "TipoFlete" NOT NULL,
    "compra_id" TEXT,
    "venta_id" TEXT,
    "tercero_nombre" TEXT,
    "origen" TEXT,
    "destino" TEXT,
    "kilos" DECIMAL(10,2),
    "vehiculo" TEXT,
    "costo_combustible" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "costo_chofer" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "costo_peajes" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "costo_otros" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "costo_total" DECIMAL(12,2) NOT NULL,
    "tarifa_cobrada" DECIMAL(12,2),
    "observaciones" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "fletes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fletes_fecha_idx" ON "fletes"("fecha");
CREATE INDEX "fletes_compra_id_idx" ON "fletes"("compra_id");
CREATE INDEX "fletes_venta_id_idx" ON "fletes"("venta_id");

-- AddForeignKey
ALTER TABLE "fletes" ADD CONSTRAINT "fletes_compra_id_fkey" FOREIGN KEY ("compra_id") REFERENCES "compras"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "fletes" ADD CONSTRAINT "fletes_venta_id_fkey" FOREIGN KEY ("venta_id") REFERENCES "ventas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
