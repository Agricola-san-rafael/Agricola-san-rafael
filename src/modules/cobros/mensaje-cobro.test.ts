import { describe, expect, it } from "vitest";
import { armarMensajeCobro, normalizarTelefonoWhatsApp, urlWhatsApp } from "./mensaje-cobro";

describe("normalizarTelefonoWhatsApp", () => {
  it("acepta el formato +569XXXXXXXX", () => {
    expect(normalizarTelefonoWhatsApp("+56965821782")).toBe("56965821782");
  });
  it("agrega el código de país a un celular de 9 dígitos", () => {
    expect(normalizarTelefonoWhatsApp("9 6582 1782")).toBe("56965821782");
  });
  it("agrega 569 a un número de 8 dígitos", () => {
    expect(normalizarTelefonoWhatsApp("65821782")).toBe("56965821782");
  });
  it("devuelve null si falta o es inválido", () => {
    expect(normalizarTelefonoWhatsApp(null)).toBeNull();
    expect(normalizarTelefonoWhatsApp("123")).toBeNull();
  });
});

describe("armarMensajeCobro", () => {
  const lineas = [
    { fecha: new Date("2026-09-03T00:00:00Z"), detalle: "300 kg Hass COM A", pendiente: 1000000, total: 1000000 },
    { fecha: new Date("2026-09-10T00:00:00Z"), detalle: "100 kg Hass COM B", pendiente: 50000, total: 200000 },
  ];
  const mensaje = armarMensajeCobro("Bryan", lineas, 1050000);

  it("incluye el nombre, cada línea y el total", () => {
    expect(mensaje).toContain("Hola Bryan");
    expect(mensaje).toContain("300 kg Hass COM A");
    expect(mensaje).toContain("Total a pagar:");
  });
  it("marca como saldo la venta abonada en parte", () => {
    const partes = mensaje.split("\n").filter((l) => l.startsWith("•"));
    expect(partes[0]).not.toContain("(saldo)");
    expect(partes[1]).toContain("(saldo)");
  });
});

describe("urlWhatsApp", () => {
  it("arma el enlace con el texto codificado", () => {
    const url = urlWhatsApp("+56965821782", "Hola & gracias");
    expect(url).toBe("https://wa.me/56965821782?text=Hola%20%26%20gracias");
  });
  it("devuelve null si no hay teléfono usable", () => {
    expect(urlWhatsApp(null, "Hola")).toBeNull();
  });
});
