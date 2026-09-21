import { describe, expect, it } from "vitest";
import { debeAvisarAtraso } from "./atrasos";

describe("debeAvisarAtraso", () => {
  it("no avisa mientras la deuda no pasa el umbral", () => {
    expect(debeAvisarAtraso(30, 30)).toBe(false);
    expect(debeAvisarAtraso(10, 30)).toBe(false);
  });
  it("avisa el primer día que pasa el umbral", () => {
    expect(debeAvisarAtraso(31, 30)).toBe(true);
  });
  it("avisa cada 7 días después y no los días intermedios", () => {
    expect(debeAvisarAtraso(32, 30)).toBe(false);
    expect(debeAvisarAtraso(37, 30)).toBe(false);
    expect(debeAvisarAtraso(38, 30)).toBe(true);
    expect(debeAvisarAtraso(45, 30)).toBe(true);
  });
});
