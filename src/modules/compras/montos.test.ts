import { describe, expect, it } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import { calcularMontosCompra, compraTienePrecioNeto } from "./montos";

const d = (n: number | string) => new Prisma.Decimal(n);

describe("calcularMontosCompra", () => {
  it("proveedor sin IVA: total y costo son kilos x precio", () => {
    const m = calcularMontosCompra({ kilos: d(125), precioKg: d(2400), facturaConIva: false, informoNetoOIva: false });
    expect(m.total.toNumber()).toBe(300000);
    expect(m.costoKg.toNumber()).toBe(2400);
    expect(m.neto).toBeUndefined();
  });
  it("proveedor con IVA y solo precio: suma 19% al total y al costo", () => {
    const m = calcularMontosCompra({ kilos: d(100), precioKg: d(1000), facturaConIva: true, informoNetoOIva: false });
    expect(m.neto?.toNumber()).toBe(100000);
    expect(m.iva?.toNumber()).toBe(19000);
    expect(m.total.toNumber()).toBe(119000);
    expect(m.costoKg.toNumber()).toBe(1190);
  });
  it("proveedor con IVA y factura con neto/IVA informado: respeta el precio (ya trae IVA)", () => {
    const m = calcularMontosCompra({ kilos: d(100), precioKg: d(1190), facturaConIva: true, informoNetoOIva: true });
    expect(m.total.toNumber()).toBe(119000);
    expect(m.costoKg.toNumber()).toBe(1190);
  });
});

describe("compraTienePrecioNeto", () => {
  it("sin neto guardado se considera precio neto", () => {
    expect(compraTienePrecioNeto({ kilos: d(10), precioKg: d(1000), total: d(10000), neto: null })).toBe(true);
  });
  it("con neto y total igual a kilos x precio es un precio con IVA incluido", () => {
    expect(compraTienePrecioNeto({ kilos: d(10), precioKg: d(1190), total: d(11900), neto: d(10000) })).toBe(false);
  });
  it("con total mayor a kilos x precio es un precio neto", () => {
    expect(compraTienePrecioNeto({ kilos: d(10), precioKg: d(1000), total: d(11900), neto: d(10000) })).toBe(true);
  });
});
