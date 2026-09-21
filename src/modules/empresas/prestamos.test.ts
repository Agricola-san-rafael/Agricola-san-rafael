import { describe, expect, it } from "vitest";
import { montoConSigno, movimientoEmpresasSchema } from "./prestamos";

describe("montoConSigno", () => {
  it("un préstamo suma y una devolución resta", () => {
    expect(montoConSigno("prestamo", 5000000)).toBe(5000000);
    expect(montoConSigno("devolucion", 1000000)).toBe(-1000000);
  });
});

describe("movimientoEmpresasSchema", () => {
  it("rechaza un monto cero o un concepto vacío", () => {
    expect(movimientoEmpresasSchema.safeParse({ fecha: "2026-07-01", tipo: "prestamo", monto: 0, concepto: "abono" }).success).toBe(false);
    expect(movimientoEmpresasSchema.safeParse({ fecha: "2026-07-01", tipo: "prestamo", monto: 100, concepto: "" }).success).toBe(false);
  });
});
