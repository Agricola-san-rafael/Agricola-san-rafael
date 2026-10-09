import { describe, expect, it } from "vitest";
import { calcularValorEmpresa } from "./valor-empresa";

const base = {
  efectivo: 1_687_300,
  banco: -957_430,
  stock: 8_593_693,
  kilosStock: 7_370,
  porCobrar: 11_074_255,
  porPagar: 4_334_898,
  prestamoATransporte: 41_786_042,
};

describe("calcularValorEmpresa", () => {
  it("un banco sobregirado cuenta como deuda y no como plata", () => {
    const v = calcularValorEmpresa(base);
    expect(v.tienes.banco).toBe(0);
    expect(v.debes.sobregiroBanco).toBe(957_430);
    expect(v.debes.total).toBe(5_292_328);
  });

  it("el valor operativo es igual al capital de trabajo (por cobrar − por pagar + stock + caja)", () => {
    const v = calcularValorEmpresa(base);
    const capitalDeTrabajo = base.porCobrar - base.porPagar + base.stock + base.efectivo + base.banco;
    expect(v.valorOperativo).toBe(capitalDeTrabajo);
    expect(v.tienes.total).toBe(21_355_248);
  });

  it("el préstamo al transporte se suma aparte, al final", () => {
    const v = calcularValorEmpresa(base);
    expect(v.valorTotal).toBe(v.valorOperativo + 41_786_042);
  });

  it("con banco positivo suma como activo y no hay sobregiro", () => {
    const v = calcularValorEmpresa({ ...base, banco: 500_000 });
    expect(v.tienes.banco).toBe(500_000);
    expect(v.debes.sobregiroBanco).toBe(0);
  });
});
