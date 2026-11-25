-- AlterTable
ALTER TABLE "parametros_transporte" ADD COLUMN "km_por_peaje" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN "costo_por_peaje" DECIMAL(12,2) NOT NULL DEFAULT 0;
