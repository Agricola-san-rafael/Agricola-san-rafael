-- Fila única de tarifas por km del transporte (combustible y tarifa cobrada),
-- para sugerir costos/tarifas de un viaje a partir de sus km recorridos.
CREATE TABLE "parametros_transporte" (
    "id" TEXT NOT NULL,
    "combustible_por_km" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "tarifa_por_km" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "parametros_transporte_pkey" PRIMARY KEY ("id")
);
