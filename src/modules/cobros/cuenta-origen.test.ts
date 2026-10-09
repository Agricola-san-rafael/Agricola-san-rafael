import { describe, expect, it } from "vitest";
import { claveCuentaOrigen, normalizarBanco, terminacionDeCuenta } from "./cuenta-origen";

describe("normalizarBanco", () => {
  it("reconoce los bancos de los comprobantes que llegan", () => {
    expect(normalizarBanco("BCI")).toBe("bci");
    expect(normalizarBanco("BancoEstado")).toBe("estado");
    expect(normalizarBanco("Banco del Estado de Chile")).toBe("estado");
    expect(normalizarBanco("CuentaRUT")).toBe("estado");
    expect(normalizarBanco("Banco de Chile")).toBe("chile");
    expect(normalizarBanco("Banco Santander")).toBe("santander");
    expect(normalizarBanco("Mercado Pago")).toBe("mercadopago");
  });

  it("deja un nombre sencillo para un banco que no conoce, y vacío si no hay dato", () => {
    expect(normalizarBanco("Banco Ripley")).toBe("ripley");
    expect(normalizarBanco(null)).toBe("");
    expect(normalizarBanco("")).toBe("");
  });
});

describe("terminacionDeCuenta", () => {
  it("toma los últimos 4 dígitos aunque la cuenta venga tapada o con guiones", () => {
    expect(terminacionDeCuenta("Cta. Vista N.º ****8648")).toBe("8648");
    expect(terminacionDeCuenta("CuentaRUT 00026859977")).toBe("9977");
    expect(terminacionDeCuenta("0-000-9685734-9")).toBe("7349");
  });

  it("devuelve null si no hay al menos 4 dígitos", () => {
    expect(terminacionDeCuenta(null)).toBeNull();
    expect(terminacionDeCuenta("Cta. ***")).toBeNull();
    expect(terminacionDeCuenta("123")).toBeNull();
  });
});

describe("claveCuentaOrigen", () => {
  it("junta banco y terminación", () => {
    expect(claveCuentaOrigen("Cta. Vista ****8648", "BCI")).toEqual({ banco: "bci", terminacion: "8648" });
  });

  it("acepta una cuenta sin banco", () => {
    expect(claveCuentaOrigen("****8648", null)).toEqual({ banco: "", terminacion: "8648" });
  });

  it("no hay clave si la cuenta no sirve", () => {
    expect(claveCuentaOrigen(null, "BCI")).toBeNull();
  });
});
