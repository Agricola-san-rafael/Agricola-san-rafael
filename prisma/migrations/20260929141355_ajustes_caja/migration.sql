-- CreateTable
CREATE TABLE "ajustes_caja" (
    "id" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "monto" DECIMAL(14,2) NOT NULL,
    "motivo" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "ajustes_caja_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ajustes_caja_fecha_idx" ON "ajustes_caja"("fecha");
