import { describe, expect, it } from "vitest";
import { debeBloquearLogin } from "./bloqueo";

describe("debeBloquearLogin", () => {
  it("deja pasar mientras hay pocos fallos", () => {
    expect(debeBloquearLogin(0, 0)).toBe(false);
    expect(debeBloquearLogin(4, 10)).toBe(false);
  });
  it("bloquea al llegar a 5 fallos del mismo correo", () => {
    expect(debeBloquearLogin(5, 5)).toBe(true);
  });
  it("bloquea si una misma IP acumula demasiados fallos", () => {
    expect(debeBloquearLogin(1, 30)).toBe(true);
  });
});
