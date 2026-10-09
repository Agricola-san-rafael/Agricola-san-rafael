import { describe, expect, it } from "vitest";
import { evaluarCredito } from "./credito";

const base = { saldo: 1_000_000, limite: 2_000_000, ventaNueva: 0, diasDeudaMasAntigua: 5, plazoDias: 30 };

describe("evaluarCredito", () => {
  it("dentro del límite y al día no hay nada que avisar", () => {
    expect(evaluarCredito(base)).toEqual({
      saldoConVenta: 1_000_000,
      sobreLimite: false,
      exceso: 0,
      vencida: false,
      diasAtraso: 0,
    });
  });

  it("la venta nueva cuenta para el límite", () => {
    const r = evaluarCredito({ ...base, ventaNueva: 1_500_000 });
    expect(r.sobreLimite).toBe(true);
    expect(r.exceso).toBe(500_000);
    expect(r.saldoConVenta).toBe(2_500_000);
  });

  it("justo en el límite no lo excede", () => {
    expect(evaluarCredito({ ...base, ventaNueva: 1_000_000 }).sobreLimite).toBe(false);
  });

  it("sin límite nunca excede", () => {
    expect(evaluarCredito({ ...base, limite: null, ventaNueva: 99_000_000 }).sobreLimite).toBe(false);
  });

  it("deuda más antigua que el plazo está vencida", () => {
    const r = evaluarCredito({ ...base, diasDeudaMasAntigua: 40 });
    expect(r.vencida).toBe(true);
    expect(r.diasAtraso).toBe(10);
  });

  it("sin deuda no hay atraso aunque los días sean altos", () => {
    expect(evaluarCredito({ ...base, saldo: 0, diasDeudaMasAntigua: 90 }).vencida).toBe(false);
  });
});
