-- CreateTable
CREATE TABLE "tipos_caja" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "capacidad_kg" DECIMAL(6,2),
    "stock_actual" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tipos_caja_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tipos_caja_nombre_key" ON "tipos_caja"("nombre");
