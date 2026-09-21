-- CreateEnum
CREATE TYPE "EmpresaGasto" AS ENUM ('agricola', 'transporte');

-- AlterTable
ALTER TABLE "gastos_operacionales" ADD COLUMN "empresa" "EmpresaGasto" NOT NULL DEFAULT 'agricola';

-- CreateTable
CREATE TABLE "movimientos_entre_empresas" (
    "id" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "monto" DECIMAL(14,2) NOT NULL,
    "concepto" TEXT NOT NULL,
    "referencia" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "movimientos_entre_empresas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "movimientos_entre_empresas_fecha_idx" ON "movimientos_entre_empresas"("fecha");
