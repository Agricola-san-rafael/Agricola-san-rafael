import { describe, expect, it } from "vitest";
import { ES_INCOBRABLE, calcularEquilibrioVentas } from "./equilibrio";

describe("calcularEquilibrioVentas", () => {
  it("divide los costos fijos por el margen bruto", () => {
    expect(calcularEquilibrioVentas(500000, 0.1)).toBe(5000000);
  });
  it("sin margen no hay equilibrio", () => {
    expect(calcularEquilibrioVentas(500000, 0)).toBeNull();
    expect(calcularEquilibrioVentas(500000, -0.05)).toBeNull();
  });
});

describe("ES_INCOBRABLE", () => {
  it("reconoce las condonaciones de deuda", () => {
    expect(ES_INCOBRABLE.test("Condonación de saldo a Cristian Carrillo (deuda incobrable)")).toBe(true);
    expect(ES_INCOBRABLE.test("Pago a cosechadores por servicio de cosecha")).toBe(false);
  });
});
