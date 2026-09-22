-- CreateEnum
CREATE TYPE "EstadoCobroFlete" AS ENUM ('pendiente', 'cobrado');

-- AlterTable fletes
ALTER TABLE "fletes"
  ADD COLUMN "km" DECIMAL(8,2),
  ADD COLUMN "chofer" TEXT,
  ADD COLUMN "estado_cobro" "EstadoCobroFlete" NOT NULL DEFAULT 'pendiente',
  ADD COLUMN "fecha_cobro" DATE,
  ADD COLUMN "n_factura" TEXT,
  ADD COLUMN "total_facturado" DECIMAL(12,2);

-- CreateTable costos fijos recurrentes
CREATE TABLE "costos_fijos_recurrentes" (
    "id" TEXT NOT NULL,
    "empresa" "EmpresaGasto" NOT NULL DEFAULT 'transporte',
    "concepto" TEXT NOT NULL,
    "categoria" "CategoriaGasto" NOT NULL DEFAULT 'otro',
    "monto" DECIMAL(12,2) NOT NULL,
    "dia_del_mes" INTEGER NOT NULL,
    "desde" DATE NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "pagado_por_agricola" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "costos_fijos_recurrentes_pkey" PRIMARY KEY ("id")
);

-- AlterTable gastos
ALTER TABLE "gastos_operacionales" ADD COLUMN "costo_fijo_id" TEXT;
CREATE INDEX "gastos_operacionales_costo_fijo_id_idx" ON "gastos_operacionales"("costo_fijo_id");
ALTER TABLE "gastos_operacionales" ADD CONSTRAINT "gastos_operacionales_costo_fijo_id_fkey" FOREIGN KEY ("costo_fijo_id") REFERENCES "costos_fijos_recurrentes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable movimientos de chofer
CREATE TABLE "movimientos_chofer" (
    "id" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "chofer" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "concepto" TEXT NOT NULL,
    "flete_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "movimientos_chofer_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "movimientos_chofer_chofer_idx" ON "movimientos_chofer"("chofer");
ALTER TABLE "movimientos_chofer" ADD CONSTRAINT "movimientos_chofer_flete_id_fkey" FOREIGN KEY ("flete_id") REFERENCES "fletes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
