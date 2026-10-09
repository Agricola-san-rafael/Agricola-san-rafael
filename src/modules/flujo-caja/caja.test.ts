import { describe, expect, it } from "vitest";
import { cajaDeGasto, cajaDeMedioPago, redondear2, sumarSaldos } from "./caja";

describe("cajaDeMedioPago", () => {
  it("transferencias, depósitos y Mercado Pago van al banco", () => {
    expect(cajaDeMedioPago("transferencia")).toBe("banco");
    expect(cajaDeMedioPago("deposito_cajavecina")).toBe("banco");
    expect(cajaDeMedioPago("mercadopago")).toBe("banco");
  });

  it("efectivo y 'otro' van a la caja de efectivo", () => {
    expect(cajaDeMedioPago("efectivo")).toBe("efectivo");
    expect(cajaDeMedioPago("otro")).toBe("efectivo");
  });
});

describe("cajaDeGasto", () => {
  it("solo la transferencia sale del banco", () => {
    expect(cajaDeGasto("transferencia")).toBe("banco");
    expect(cajaDeGasto("efectivo")).toBe("efectivo");
    expect(cajaDeGasto("otro")).toBe("efectivo");
  });
});

describe("sumarSaldos", () => {
  it("suma cada caja por separado y el total", () => {
    const saldos = sumarSaldos([
      { caja: "efectivo", monto: 100 },
      { caja: "banco", monto: 500 },
      { caja: "efectivo", monto: -30 },
      { caja: "banco", monto: -200 },
    ]);
    expect(saldos).toEqual({ efectivo: 70, banco: 300, total: 370 });
  });

  it("sin movimientos todo es cero", () => {
    expect(sumarSaldos([])).toEqual({ efectivo: 0, banco: 0, total: 0 });
  });
});

describe("redondear2", () => {
  it("deja dos decimales", () => {
    expect(redondear2(16841809.789999)).toBe(16841809.79);
  });
});
