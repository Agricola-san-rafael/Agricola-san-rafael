import { describe, expect, it } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import { calcularConsumoFIFO, type LoteDisponible } from "./fifo";

function lote(id: string, kilos: number, costo: number, fecha: string): LoteDisponible {
  return {
    id,
    kilosDisponibles: new Prisma.Decimal(kilos),
    costoKg: new Prisma.Decimal(costo),
    fechaIngreso: new Date(fecha),
  };
}

describe("calcularConsumoFIFO", () => {
  it("consume un solo lote cuando alcanza", () => {
    const lotes = [lote("A", 100, 1000, "2026-01-01")];
    const { consumos, kilosFaltantes } = calcularConsumoFIFO(lotes, new Prisma.Decimal(60));

    expect(consumos).toHaveLength(1);
    expect(consumos[0].loteId).toBe("A");
    expect(consumos[0].kilosConsumidos.toNumber()).toBe(60);
    expect(kilosFaltantes.toNumber()).toBe(0);
  });

  it("consume el lote más antiguo primero y sigue con el siguiente", () => {
    const lotes = [
      lote("viejo", 50, 1000, "2026-01-01"),
      lote("nuevo", 100, 1200, "2026-01-10"),
    ];
    const { consumos, kilosFaltantes } = calcularConsumoFIFO(lotes, new Prisma.Decimal(80));

    expect(consumos).toHaveLength(2);
    expect(consumos[0]).toMatchObject({ loteId: "viejo" });
    expect(consumos[0].kilosConsumidos.toNumber()).toBe(50);
    expect(consumos[0].costoKgLote.toNumber()).toBe(1000);
    expect(consumos[1]).toMatchObject({ loteId: "nuevo" });
    expect(consumos[1].kilosConsumidos.toNumber()).toBe(30);
    expect(kilosFaltantes.toNumber()).toBe(0);
  });

  it("reporta kilosFaltantes cuando el stock total no alcanza", () => {
    const lotes = [lote("A", 20, 1000, "2026-01-01"), lote("B", 10, 1000, "2026-01-02")];
    const { consumos, kilosFaltantes } = calcularConsumoFIFO(lotes, new Prisma.Decimal(50));

    expect(consumos).toHaveLength(2);
    expect(consumos[0].kilosConsumidos.toNumber()).toBe(20);
    expect(consumos[1].kilosConsumidos.toNumber()).toBe(10);
    expect(kilosFaltantes.toNumber()).toBe(20);
  });

  it("no consume nada y reporta todo faltante si no hay lotes", () => {
    const { consumos, kilosFaltantes } = calcularConsumoFIFO([], new Prisma.Decimal(10));
    expect(consumos).toHaveLength(0);
    expect(kilosFaltantes.toNumber()).toBe(10);
  });

  it("ignora lotes con kilos_disponibles en 0", () => {
    const lotes = [lote("vacio", 0, 1000, "2026-01-01"), lote("con-stock", 30, 1000, "2026-01-02")];
    const { consumos } = calcularConsumoFIFO(lotes, new Prisma.Decimal(10));
    expect(consumos).toHaveLength(1);
    expect(consumos[0].loteId).toBe("con-stock");
  });
});
