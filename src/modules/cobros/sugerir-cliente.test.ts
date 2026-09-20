import { describe, expect, it } from "vitest";
import { sugerirCliente, type ClienteCandidato } from "./sugerir-cliente";

const clientes: ClienteCandidato[] = [
  { id: "claudio", nombre: "Claudio Arellano", rut: null, saldo: 140000 },
  { id: "gina", nombre: "Gina Contreras Alcántara", rut: "10.608.434-3", saldo: 0 },
  { id: "fabian-e", nombre: "Fabián Espinoza", rut: null, saldo: 0 },
  { id: "fabian-o", nombre: "Fabián Olmos", rut: null, saldo: 0 },
  { id: "luis", nombre: "Luis", rut: null, saldo: 0 },
  { id: "teos", nombre: "TEOS SPA", rut: "77.742.087-9", saldo: 0 },
];

const pago = (p: Partial<Parameters<typeof sugerirCliente>[1]>) => ({
  pagadorNombre: null,
  pagadorRut: null,
  glosa: null,
  ...p,
});

describe("sugerirCliente", () => {
  it("encuentra al cliente por el nombre del origen y la glosa", () => {
    expect(
      sugerirCliente(clientes, pago({ pagadorNombre: "CLAUDIO JOAQUIN ARELLANO..", glosa: "50 kilos paltas claudio" })),
    ).toBe("claudio");
  });
  it("prioriza el RUT exacto aunque el nombre no coincida", () => {
    expect(sugerirCliente(clientes, pago({ pagadorRut: "77742087-9", pagadorNombre: "Otro nombre" }))).toBe("teos");
  });
  it("acepta dos palabras del nombre aunque falte una", () => {
    expect(sugerirCliente(clientes, pago({ pagadorNombre: "Gina Contreras" }))).toBe("gina");
  });
  it("no adivina si solo coincide un nombre de dos palabras", () => {
    expect(sugerirCliente(clientes, pago({ pagadorNombre: "Fabián Pérez" }))).toBeNull();
  });
  it("reconoce a un cliente de una sola palabra", () => {
    expect(sugerirCliente(clientes, pago({ glosa: "pago luis" }))).toBe("luis");
  });
  it("devuelve null si no hay pista", () => {
    expect(sugerirCliente(clientes, pago({ pagadorRut: "16.148.604-3" }))).toBeNull();
  });
});
