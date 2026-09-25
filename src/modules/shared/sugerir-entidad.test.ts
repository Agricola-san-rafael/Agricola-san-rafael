import { describe, expect, it } from "vitest";
import { sugerirEntidad } from "./sugerir-entidad";

const candidatos = [
  { id: "1", nombre: "Alex Avocados Quinta Region", rut: "77.423.716-K" },
  { id: "2", nombre: "Betta Hermanos Limitada", rut: "77.192.292-9" },
  { id: "3", nombre: "Comercializadora SYD SPA", rut: "77.504.459-4" },
];

describe("sugerirEntidad", () => {
  it("encuentra por RUT exacto aunque el nombre de fantasía sea distinto", () => {
    // Caso real: la factura dice "Comercializadora Limache SPA" pero el
    // cliente ya está guardado como "Alex Avocados Quinta Region" con el
    // mismo RUT.
    expect(
      sugerirEntidad(candidatos, { nombre: "Comercializadora Limache SPA", rut: "77.423.716-K" }),
    ).toBe("1");
  });

  it("ignora el formato del RUT (puntos, guion, mayúsculas)", () => {
    expect(sugerirEntidad(candidatos, { nombre: null, rut: "77192292-9" })).toBe("2");
  });

  it("si no hay RUT, busca por palabras del nombre en común", () => {
    expect(sugerirEntidad(candidatos, { nombre: "Betta Hermanos", rut: null })).toBe("2");
  });

  it("devuelve null si no hay ninguna coincidencia", () => {
    expect(sugerirEntidad(candidatos, { nombre: "Frutas del Valle", rut: "1-9" })).toBeNull();
  });

  it("devuelve null si no se pasa ni nombre ni rut", () => {
    expect(sugerirEntidad(candidatos, { nombre: null, rut: null })).toBeNull();
  });

  it("el RUT manda por sobre una coincidencia de nombre distinta", () => {
    // El nombre no separece a nada, pero el RUT sí matchea a "1".
    expect(
      sugerirEntidad(candidatos, { nombre: "Un nombre cualquiera sin relacion", rut: "77.423.716-K" }),
    ).toBe("1");
  });
});
