import { describe, expect, it } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import { aplanarFila } from "./exportar";

describe("aplanarFila", () => {
  it("convierte Decimal a número y Date a texto", () => {
    const r = aplanarFila({ monto: new Prisma.Decimal("1234.50"), fecha: new Date("2026-09-22T00:00:00Z"), activo: true, nota: null });
    expect(r).toEqual({ monto: 1234.5, fecha: "2026-09-22T00:00:00.000Z", activo: true, nota: null });
  });
  it("nunca incluye contraseñas ni tokens", () => {
    const r = aplanarFila({ email: "a@b.cl", passwordHash: "secreto", tokenHash: "otro" });
    expect(r).toEqual({ email: "a@b.cl" });
  });
});
