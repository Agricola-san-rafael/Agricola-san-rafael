import { describe, expect, it } from "vitest";
import {
  agruparStock,
  destinosFrecuentes,
  nombreComercial,
  sugerirOfertas,
  textoFletesWhatsApp,
  textoStockMarketplace,
  textoStockWhatsApp,
} from "./contenido";

const hoy = new Date("2026-11-23T12:00:00Z");
const dias = (n: number) => new Date(hoy.getTime() - n * 86_400_000);

describe("nombreComercial", () => {
  it("quita los sufijos CAT de Betta y traduce COM", () => {
    expect(nombreComercial("COM B CAT2")).toBe("Comercial B");
    expect(nombreComercial("Primera Extra CAT1.5")).toBe("Primera Extra");
    expect(nombreComercial("20 CAT1")).toBe("Calibre 20");
    expect(nombreComercial("Todo Calibre CAT1")).toBe("Todo calibre");
  });
  it("junta Primera con Extra con Primera Extra, y Etiolada con Descarte", () => {
    expect(nombreComercial("Primera con Extra")).toBe("Primera Extra");
    expect(nombreComercial("Etiolada")).toBe("Descarte");
    expect(nombreComercial("Descarte CAT2")).toBe("Descarte");
  });
});

describe("agruparStock", () => {
  const productos = agruparStock([
    { calibre: "Descarte CAT2", kilos: 489, fechaIngreso: dias(5) },
    { calibre: "Etiolada", kilos: 378, fechaIngreso: dias(3) },
    { calibre: "Primera Extra", kilos: 90, fechaIngreso: dias(10) },
    { calibre: "Segunda", kilos: 1.3, fechaIngreso: dias(4) },
  ]);

  it("suma por nombre comercial, redondea a la decena hacia abajo y ordena por calidad", () => {
    expect(productos).toEqual([
      { nombre: "Primera Extra", kilos: 90 },
      { nombre: "Descarte", kilos: 860 },
    ]);
  });
  it("no ofrece restos muy chicos", () => {
    expect(productos.find((p) => p.nombre === "Segunda")).toBeUndefined();
  });
});

describe("sugerirOfertas", () => {
  it("sugiere lotes grandes que llevan días en bodega", () => {
    const ofertas = sugerirOfertas([{ calibre: "COM B CAT2", kilos: 399, fechaIngreso: dias(6) }], hoy);
    expect(ofertas).toHaveLength(1);
    expect(ofertas[0].nombre).toBe("Comercial B");
    expect(ofertas[0].motivo).toContain("6 días");
    expect(ofertas[0].dias).toBe(6);
  });
  it("no sugiere fruta recién llegada ni lotes chicos", () => {
    expect(
      sugerirOfertas(
        [
          { calibre: "COM B CAT2", kilos: 399, fechaIngreso: dias(1) },
          { calibre: "Tercera", kilos: 40, fechaIngreso: dias(9) },
        ],
        hoy,
      ),
    ).toEqual([]);
  });
  it("sugiere descarte cuando se acumula mucho aunque sea nuevo", () => {
    const ofertas = sugerirOfertas([{ calibre: "Descarte CAT2", kilos: 802, fechaIngreso: dias(1) }], hoy);
    expect(ofertas.map((o) => o.nombre)).toEqual(["Descarte"]);
    expect(ofertas[0].texto).toContain("guacamole");
  });
});

describe("textos de stock", () => {
  const productos = [{ nombre: "Primera Extra", kilos: 90 }];
  it("nunca publican precios", () => {
    for (const texto of [textoStockWhatsApp(productos, hoy), textoStockMarketplace(productos)]) {
      expect(texto).not.toMatch(/\$\s?\d/);
      expect(texto).toContain("Primera Extra: 90 kg");
      expect(texto).toContain("+56 9 7889 3769");
    }
  });
});

describe("fletes", () => {
  it("normaliza los destinos y descarta los viajes dentro de Quillota", () => {
    expect(
      destinosFrecuentes(["Valparaiso", "Valparaíso", "Santiago", "Quillota trs. Collao", "Quilpué → Huechuraba", "La ligua", null]),
    ).toEqual(["Valparaíso", "Huechuraba", "La Ligua", "Santiago"]);
  });
  it("arma el aviso con la capacidad del camión", () => {
    const texto = textoFletesWhatsApp({ destinos: ["Santiago"], capacidadKg: 8000, vehiculo: "Hino" });
    expect(texto).toContain("Camión Hino de hasta 8 toneladas");
    expect(texto).toContain("Santiago");
  });
});
