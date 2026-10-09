-- Tope de deuda por cliente y alerta cuando lo pasa.
ALTER TABLE "clientes" ADD COLUMN "limite_credito" INTEGER;

ALTER TYPE "TipoAlerta" ADD VALUE IF NOT EXISTS 'credito_excedido';
