import { describe, expect, it } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import { repartirCobros, separarAbonos } from "./estado-pago";

const d = (n: number) => new Prisma.Decimal(n);
const pendientes = (r: ReturnType<typeof repartirCobros>) => r.map((x) => x.pendiente.toNumber());

describe("repartirCobros", () => {
  const ventas = [
    { id: "a", total: d(100) },
    { id: "b", total: d(100) },
    { id: "c", total: d(100) },
  ];

  it("sin vínculos, reparte de la más antigua a la más nueva", () => {
    expect(pendientes(repartirCobros(ventas, d(150)))).toEqual([0, 50, 100]);
  });
  it("un pago ligado a una venta se le aplica a ella y no a las antiguas", () => {
    const { abonadoPorVenta, libre } = separarAbonos(
      [{ monto: d(100), ventaId: "c" }],
      new Set(["a", "b", "c"]),
    );
    expect(pendientes(repartirCobros(ventas, libre, abonadoPorVenta))).toEqual([100, 100, 0]);
  });
  it("el excedente de un pago ligado pasa a los pagos libres", () => {
    const { abonadoPorVenta, libre } = separarAbonos(
      [{ monto: d(130), ventaId: "c" }, { monto: d(20), ventaId: null }],
      new Set(["a", "b", "c"]),
    );
    expect(pendientes(repartirCobros(ventas, libre, abonadoPorVenta))).toEqual([50, 100, 0]);
  });
  it("un pago ligado a una venta que ya no existe cuenta como libre", () => {
    const { abonadoPorVenta, libre } = separarAbonos([{ monto: d(100), ventaId: "borrada" }], new Set(["a"]));
    expect(libre.toNumber()).toBe(100);
    expect(abonadoPorVenta.size).toBe(0);
  });
});
