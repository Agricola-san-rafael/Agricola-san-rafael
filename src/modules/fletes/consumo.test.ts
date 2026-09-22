import { describe, expect, it } from "vitest";
import { calcularSugeridoPorKm } from "./consumo";

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
