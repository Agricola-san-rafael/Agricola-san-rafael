-- CreateEnum
CREATE TYPE "CajaTipo" AS ENUM ('efectivo', 'banco');

-- AlterTable
ALTER TABLE "ajustes_caja" ADD COLUMN "caja" "CajaTipo" NOT NULL DEFAULT 'efectivo';

-- Los ajustes que ya existían hablaban de efectivo, salvo el de la cuenta corriente.
UPDATE "ajustes_caja" SET "caja" = 'banco' WHERE "motivo" LIKE 'Saldo en cuenta corriente%';

-- CreateTable
CREATE TABLE "cuentas_origen_cliente" (
    "id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "banco" TEXT NOT NULL DEFAULT '',
    "terminacion" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "cuentas_origen_cliente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cuentas_origen_cliente_cliente_id_idx" ON "cuentas_origen_cliente"("cliente_id");

-- CreateIndex
CREATE UNIQUE INDEX "cuentas_origen_cliente_banco_terminacion_key" ON "cuentas_origen_cliente"("banco", "terminacion");

-- AddForeignKey
ALTER TABLE "cuentas_origen_cliente" ADD CONSTRAINT "cuentas_origen_cliente_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
