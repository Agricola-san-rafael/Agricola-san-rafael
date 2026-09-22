-- Cada empresa (agrícola / transporte) tiene su propia lista de clientes y proveedores.
ALTER TABLE "clientes" ADD COLUMN "empresa" "EmpresaGasto" NOT NULL DEFAULT 'agricola';
ALTER TABLE "proveedores" ADD COLUMN "empresa" "EmpresaGasto" NOT NULL DEFAULT 'agricola';

CREATE INDEX "clientes_empresa_idx" ON "clientes"("empresa");
CREATE INDEX "proveedores_empresa_idx" ON "proveedores"("empresa");

-- Un flete a un tercero puede enlazarse a un cliente real del transporte
-- (en vez de solo un nombre libre en tercero_nombre).
ALTER TABLE "fletes" ADD COLUMN "cliente_id" TEXT;
ALTER TABLE "fletes" ADD CONSTRAINT "fletes_cliente_id_fkey"
  FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "fletes_cliente_id_idx" ON "fletes"("cliente_id");
