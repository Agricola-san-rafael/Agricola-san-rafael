import { describe, expect, it } from "vitest";
import { avisoVencimiento } from "./vencimientos";

describe("avisoVencimiento", () => {
  it("avisa solo el día exacto de anticipación", () => {
    expect(avisoVencimiento(2, 2)).toEqual({ tipo: "anticipo", dias: 2 });
    expect(avisoVencimiento(3, 2)).toBeNull();
    expect(avisoVencimiento(1, 2)).toBeNull();
  });

  it("avisa el día que vence", () => {
    expect(avisoVencimiento(0, 2)).toEqual({ tipo: "hoy" });
  });

  it("sin anticipación configurada no avisa antes de vencer", () => {
    expect(avisoVencimiento(2, 0)).toBeNull();
  });

  it("vencida: avisa el primer día y luego cada 3 días", () => {
    expect(avisoVencimiento(-1, 2)).toEqual({ tipo: "atraso", diasAtraso: 1 });
    expect(avisoVencimiento(-2, 2)).toBeNull();
    expect(avisoVencimiento(-3, 2)).toBeNull();
    expect(avisoVencimiento(-4, 2)).toEqual({ tipo: "atraso", diasAtraso: 4 });
    expect(avisoVencimiento(-7, 2)).toEqual({ tipo: "atraso", diasAtraso: 7 });
  });

  it("respeta otro intervalo de recordatorio", () => {
    expect(avisoVencimiento(-2, 2, 1)).toEqual({ tipo: "atraso", diasAtraso: 2 });
    expect(avisoVencimiento(-8, 2, 7)).toEqual({ tipo: "atraso", diasAtraso: 8 });
    expect(avisoVencimiento(-7, 2, 7)).toBeNull();
  });
});
