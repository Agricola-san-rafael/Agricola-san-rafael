import { describe, expect, it } from "vitest";
import { diferenciaDeConteo, porcentaje, repartirMerma } from "./calculo";

const lote = (id: string, kilosDisponibles: number, costoKg: number) => ({ id, kilosDisponibles, costoKg });
const suma = (xs: { kilos: number }[]) => Math.round(xs.reduce((a, x) => a + x.kilos, 0) * 100) / 100;

describe("diferenciaDeConteo", () => {
  it("dice cuántos kilos faltan o sobran", () => {
    expect(diferenciaDeConteo(688, 567)).toEqual({ faltan: 121, sobran: 0 });
    expect(diferenciaDeConteo(100, 103.5)).toEqual({ faltan: 0, sobran: 3.5 });
    expect(diferenciaDeConteo(50, 50)).toEqual({ faltan: 0, sobran: 0 });
  });

  it("no arrastra errores de decimales", () => {
    expect(diferenciaDeConteo(0.3, 0.1)).toEqual({ faltan: 0.2, sobran: 0 });
  });
});

describe("repartirMerma", () => {
  it("reparte en proporción a lo que tiene cada lote y la suma es exacta", () => {
    const r = repartirMerma([lote("a", 548, 2350), lote("b", 140, 2300)], 121);
    expect(r.map((m) => [m.loteId, m.kilos])).toEqual([
      ["a", 96.38],
      ["b", 24.62],
    ]);
    expect(suma(r)).toBe(121);
  });

  it("valoriza cada parte al costo de su lote", () => {
    const r = repartirMerma([lote("a", 548, 2350), lote("b", 140, 2300)], 121);
    expect(r[0].valor).toBe(Math.round(96.38 * 2350));
    expect(r[1].valor).toBe(Math.round(24.62 * 2300));
  });

  it("con un solo lote le toda la merma", () => {
    expect(repartirMerma([lote("a", 348, 1850)], 12.5)).toEqual([{ loteId: "a", kilos: 12.5, costoKg: 1850, valor: 23125 }]);
  });

  it("puede vaciar los lotes sin dejar kilos de más", () => {
    const r = repartirMerma([lote("a", 10.01, 1000), lote("b", 5.02, 1000)], 15.03);
    expect(r.map((m) => m.kilos)).toEqual([10.01, 5.02]);
  });

  it("la suma siempre coincide, aunque los kilos no se dividan justo", () => {
    const r = repartirMerma([lote("a", 33.33, 1), lote("b", 33.33, 1), lote("c", 33.34, 1)], 10);
    expect(suma(r)).toBe(10);
  });

  it("no toma kilos de un lote vacío", () => {
    const r = repartirMerma([lote("a", 0, 1000), lote("b", 80, 1000)], 5);
    expect(r).toEqual([{ loteId: "b", kilos: 5, costoKg: 1000, valor: 5000 }]);
  });

  it("sin merma no hay nada que repartir", () => {
    expect(repartirMerma([lote("a", 10, 1000)], 0)).toEqual([]);
  });

  it("falla si la merma es mayor que el stock", () => {
    expect(() => repartirMerma([lote("a", 10, 1000)], 10.01)).toThrow();
  });
});

describe("porcentaje", () => {
  it("calcula el porcentaje y no se rompe sin base", () => {
    expect(porcentaje(121, 688)).toBeCloseTo(17.59, 2);
    expect(porcentaje(5, 0)).toBe(0);
  });
});
