import { describe, expect, it } from "vitest";
import { ordenarPorNombre } from "./orden";

const nombres = (items: { nombre: string }[]) => items.map((i) => i.nombre);

describe("ordenarPorNombre", () => {
  it("ignora tildes y mayúsculas, como un diccionario", () => {
    const orden = ordenarPorNombre([
      { nombre: "Yake Rivas" },
      { nombre: "Ángeles" },
      { nombre: "franco gomez" },
      { nombre: "Alex Avocados" },
      { nombre: "Fabián Espinoza" },
      { nombre: "GROPAL" },
    ]);
    expect(nombres(orden)).toEqual(["Alex Avocados", "Ángeles", "Fabián Espinoza", "franco gomez", "GROPAL", "Yake Rivas"]);
  });

  it("pone la ñ después de la n", () => {
    const orden = ordenarPorNombre([{ nombre: "Ñuble" }, { nombre: "Nogales" }, { nombre: "Olmos" }]);
    expect(nombres(orden)).toEqual(["Nogales", "Ñuble", "Olmos"]);
  });

  it("no modifica la lista original", () => {
    const original = [{ nombre: "B" }, { nombre: "A" }];
    ordenarPorNombre(original);
    expect(nombres(original)).toEqual(["B", "A"]);
  });
});
