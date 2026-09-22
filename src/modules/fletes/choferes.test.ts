import { describe, expect, it } from "vitest";
import { saldosPorChofer } from "./choferes";

describe("saldosPorChofer", () => {
  it("suma deudas, resta pagos y ordena por lo que más se debe", () => {
    const r = saldosPorChofer([
      { chofer: "Tomás", monto: 80000 },
      { chofer: "Tomás", monto: 45590 },
      { chofer: "Hermano", monto: 20000 },
      { chofer: "Hermano", monto: -20000 },
    ]);
    expect(r[0]).toEqual({ chofer: "Tomás", saldo: 125590, movimientos: 2 });
    expect(r[1]).toEqual({ chofer: "Hermano", saldo: 0, movimientos: 2 });
  });
});
