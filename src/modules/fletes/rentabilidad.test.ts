import { describe, expect, it } from "vitest";
import { calcularPuntoEquilibrio, porCliente, porRuta, type ViajeRentabilidad } from "./rentabilidad";

describe("calcularPuntoEquilibrio", () => {
  it("calcula cuántos viajes hacen falta para cubrir los costos fijos", () => {
    const r = calcularPuntoEquilibrio({ costosFijosMensuales: 3000000, viajes: 3, ingresos: 829034, costoDirecto: 433120 });
    expect(Math.round(r.margenPorViaje!)).toBe(131971);
    expect(r.viajesEquilibrio).toBe(23);
    expect(r.faltan).toBe(20);
    expect(r.progreso).toBeCloseTo(3 / 23);
  });
  it("sin viajes o con margen negativo no hay punto de equilibrio calculable", () => {
    expect(calcularPuntoEquilibrio({ costosFijosMensuales: 1000, viajes: 0, ingresos: 0, costoDirecto: 0 }).viajesEquilibrio).toBeNull();
    expect(calcularPuntoEquilibrio({ costosFijosMensuales: 1000, viajes: 2, ingresos: 100, costoDirecto: 300 }).viajesEquilibrio).toBeNull();
  });
});

describe("agrupaciones", () => {
  const viajes: ViajeRentabilidad[] = [
    { origen: "Quillota", destino: "Quilpué", cliente: "Matías", km: 100, ingresos: 250000, costo: 90000 },
    { origen: "Quillota", destino: "Quilpué", cliente: "Otro", km: 100, ingresos: 200000, costo: 100000 },
    { origen: "El Melón", destino: "La Serena", cliente: "Betta", km: 714, ingresos: 484034, costo: 310590 },
  ];
  it("agrupa por ruta con utilidad por km", () => {
    const r = porRuta(viajes);
    const quillota = r.find((f) => f.nombre === "Quillota → Quilpué")!;
    expect(quillota.viajes).toBe(2);
    expect(quillota.utilidad).toBe(260000);
    expect(quillota.utilidadPorKm).toBe(1300);
  });
  it("ordena los clientes por utilidad", () => {
    expect(porCliente(viajes).map((f) => f.nombre)).toEqual(["Betta", "Matías", "Otro"]);
  });
});
