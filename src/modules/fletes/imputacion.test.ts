import { describe, expect, it } from "vitest";
import { calcularFletePorVenta, costoParaAgricola, type FleteBasico } from "./imputacion";

const flete = (p: Partial<FleteBasico>): FleteBasico => ({
  tipo: "venta", compraId: null, ventaId: null, costoTotal: 0, tarifaCobrada: null, ...p,
});

describe("costoParaAgricola", () => {
  it("usa la tarifa cobrada si existe", () => {
    expect(costoParaAgricola({ costoTotal: 80000, tarifaCobrada: 100000 })).toBe(100000);
  });
  it("usa el costo real si no hay tarifa", () => {
    expect(costoParaAgricola({ costoTotal: 80000, tarifaCobrada: null })).toBe(80000);
  });
});

describe("calcularFletePorVenta", () => {
  it("el flete de una venta va entero a esa venta", () => {
    const r = calcularFletePorVenta({
      fletes: [flete({ tipo: "venta", ventaId: "v1", costoTotal: 50000 })],
      kilosPorCompra: new Map(), consumos: [],
    });
    expect(r.get("v1")).toBe(50000);
  });
  it("el flete de una compra se reparte por kilo entre las ventas de ese lote", () => {
    const r = calcularFletePorVenta({
      fletes: [flete({ tipo: "compra", compraId: "c1", costoTotal: 100000 })],
      kilosPorCompra: new Map([["c1", 1000]]),
      consumos: [
        { ventaId: "v1", compraId: "c1", kilos: 250 },
        { ventaId: "v2", compraId: "c1", kilos: 500 },
      ],
    });
    expect(r.get("v1")).toBe(25000);
    expect(r.get("v2")).toBe(50000);
  });
  it("suma el flete propio de la venta y el prorrateado de la compra", () => {
    const r = calcularFletePorVenta({
      fletes: [
        flete({ tipo: "venta", ventaId: "v1", costoTotal: 10000 }),
        flete({ tipo: "compra", compraId: "c1", costoTotal: 40000, tarifaCobrada: 60000 }),
      ],
      kilosPorCompra: new Map([["c1", 600]]),
      consumos: [{ ventaId: "v1", compraId: "c1", kilos: 300 }],
    });
    expect(r.get("v1")).toBe(40000);
  });
  it("ignora fletes de terceros", () => {
    const r = calcularFletePorVenta({
      fletes: [flete({ tipo: "tercero", costoTotal: 90000, tarifaCobrada: 120000 })],
      kilosPorCompra: new Map(), consumos: [],
    });
    expect(r.size).toBe(0);
  });
});
