import { describe, expect, it } from "vitest";
import { calcularPeajesPorKm, calcularSugeridoPorKm } from "./consumo";

describe("calcularSugeridoPorKm", () => {
  it("multiplica km por la tarifa por km", () => {
    expect(calcularSugeridoPorKm(100, 180)).toBe(18000);
  });

  it("redondea al peso más cercano", () => {
    expect(calcularSugeridoPorKm(37.5, 180)).toBe(6750);
    expect(calcularSugeridoPorKm(33, 150.5)).toBe(Math.round(33 * 150.5));
  });

  it("da 0 si no hay km", () => {
    expect(calcularSugeridoPorKm(undefined, 180)).toBe(0);
    expect(calcularSugeridoPorKm(0, 180)).toBe(0);
  });

  it("da 0 si la tarifa por km no está configurada", () => {
    expect(calcularSugeridoPorKm(100, 0)).toBe(0);
  });
});

describe("calcularPeajesPorKm", () => {
  it("cuenta un peaje cada tantos km (ida y vuelta) y multiplica por su costo", () => {
    // 260 km ida y vuelta, un peaje cada 65 km, $3.200 cada uno => 4 peajes
    expect(calcularPeajesPorKm(260, 65, 3200)).toEqual({ cantidad: 4, costo: 12800 });
  });

  it("redondea la cantidad al peaje más cercano", () => {
    expect(calcularPeajesPorKm(250, 100, 3000)).toEqual({ cantidad: 3, costo: 9000 });
    expect(calcularPeajesPorKm(240, 100, 3000)).toEqual({ cantidad: 2, costo: 6000 });
  });

  it("da 0 peajes en un viaje muy corto", () => {
    expect(calcularPeajesPorKm(20, 100, 3000)).toEqual({ cantidad: 0, costo: 0 });
  });

  it("da 0 si no hay km", () => {
    expect(calcularPeajesPorKm(undefined, 65, 3200)).toEqual({ cantidad: 0, costo: 0 });
    expect(calcularPeajesPorKm(0, 65, 3200)).toEqual({ cantidad: 0, costo: 0 });
  });

  it("da 0 si los km por peaje o el costo por peaje no están configurados", () => {
    expect(calcularPeajesPorKm(260, 0, 3200)).toEqual({ cantidad: 0, costo: 0 });
    expect(calcularPeajesPorKm(260, 65, 0)).toEqual({ cantidad: 0, costo: 0 });
  });
});
