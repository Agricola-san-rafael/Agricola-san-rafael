import { describe, expect, it } from "vitest";
import { fleteSchema, gastoRutaSchema, sumarGastosRuta } from "./schema";

const base = { fecha: "2026-11-12", tipo: "tercero", terceroNombre: "Cliente", tarifaCobrada: 100000 };

describe("gastos en ruta", () => {
  it("suma los montos", () => {
    expect(sumarGastosRuta([{ monto: 6000 }, { monto: 2500 }])).toBe(8500);
    expect(sumarGastosRuta([])).toBe(0);
  });

  it("un viaje sin gastos en ruta queda con lista vacía", () => {
    expect(fleteSchema.parse(base).gastosRuta).toEqual([]);
  });

  it("acepta varios gastos con descripción y monto", () => {
    const f = fleteSchema.parse({ ...base, gastosRuta: [{ descripcion: " Almuerzo ", monto: "6000" }, { descripcion: "Estacionamiento", monto: 2000 }] });
    expect(f.gastosRuta).toEqual([
      { descripcion: "Almuerzo", monto: 6000 },
      { descripcion: "Estacionamiento", monto: 2000 },
    ]);
  });

  it("rechaza un gasto sin descripción o con monto cero", () => {
    expect(gastoRutaSchema.safeParse({ descripcion: "", monto: 1000 }).success).toBe(false);
    expect(gastoRutaSchema.safeParse({ descripcion: "Almuerzo", monto: 0 }).success).toBe(false);
    expect(gastoRutaSchema.safeParse({ descripcion: "Almuerzo" }).success).toBe(false);
  });

  it("un viaje propio con solo gastos en ruta tiene costo y se acepta", () => {
    const r = fleteSchema.safeParse({ fecha: "2026-11-12", tipo: "venta", ventaId: "8f14e45f-ceea-4e7a-9d6c-2f1b3c4d5e6f", gastosRuta: [{ descripcion: "Peaje extra", monto: 3000 }] });
    expect(r.success).toBe(true);
  });
});
