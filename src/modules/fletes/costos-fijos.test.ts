import { describe, expect, it } from "vitest";
import { debeGenerarseHoy, fechaDeVencimiento } from "./costos-fijos";

const d = (s: string) => new Date(`${s}T00:00:00Z`);

describe("fechaDeVencimiento", () => {
  it("usa el día pedido", () => {
    expect(fechaDeVencimiento(2026, 8, 15).toISOString().slice(0, 10)).toBe("2026-09-15");
  });
  it("en un mes corto usa el último día", () => {
    expect(fechaDeVencimiento(2026, 8, 31).toISOString().slice(0, 10)).toBe("2026-09-30");
    expect(fechaDeVencimiento(2026, 1, 30).toISOString().slice(0, 10)).toBe("2026-02-28");
  });
});

describe("debeGenerarseHoy", () => {
  const base = { diaDelMes: 15, desde: d("2026-10-01"), yaGeneradoEsteMes: false };
  it("no genera antes del día", () => {
    expect(debeGenerarseHoy({ ...base, hoy: d("2026-10-14") })).toBe(false);
  });
  it("genera el día y también después si no se había creado (por si el cron falló)", () => {
    expect(debeGenerarseHoy({ ...base, hoy: d("2026-10-15") })).toBe(true);
    expect(debeGenerarseHoy({ ...base, hoy: d("2026-10-20") })).toBe(true);
  });
  it("no repite si ya se generó este mes", () => {
    expect(debeGenerarseHoy({ ...base, hoy: d("2026-10-20"), yaGeneradoEsteMes: true })).toBe(false);
  });
  it("no genera antes de la fecha de inicio", () => {
    expect(debeGenerarseHoy({ ...base, hoy: d("2026-09-20") })).toBe(false);
  });
});
