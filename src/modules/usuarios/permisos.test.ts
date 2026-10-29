import { describe, expect, it } from "vitest";
import { operadorPuedeAbrirPagina, operadorPuedeUsarApi, paginaInicio } from "./permisos";

describe("paginaInicio", () => {
  it("el operador entra a las ventas y el resto al dashboard", () => {
    expect(paginaInicio("operador")).toBe("/ventas?empresa=agricola");
    expect(paginaInicio("admin")).toBe("/dashboard");
    expect(paginaInicio("solo_lectura")).toBe("/dashboard");
  });
});

describe("operadorPuedeAbrirPagina", () => {
  it("abre compras y ventas, con sus formularios y detalles", () => {
    for (const ruta of ["/ventas", "/ventas/nueva", "/ventas/abc-123", "/compras", "/compras/nueva", "/compras/abc-123"]) {
      expect(operadorPuedeAbrirPagina(ruta), ruta).toBe(true);
    }
  });

  it("no abre el dashboard ni ninguna otra pantalla", () => {
    for (const ruta of [
      "/dashboard",
      "/clientes",
      "/inventario",
      "/por-cobrar",
      "/gastos",
      "/flujo-caja",
      "/reportes",
      "/fletes",
      "/configuracion/usuarios",
      "/alertas",
    ]) {
      expect(operadorPuedeAbrirPagina(ruta), ruta).toBe(false);
    }
  });

  it("no se deja engañar por rutas que solo empiezan parecido", () => {
    expect(operadorPuedeAbrirPagina("/ventas-extra")).toBe(false);
    expect(operadorPuedeAbrirPagina("/comprasx")).toBe(false);
  });
});

describe("operadorPuedeUsarApi", () => {
  it("puede registrar compras y ventas, una o varias a la vez", () => {
    expect(operadorPuedeUsarApi("POST", "/api/v1/ventas")).toBe(true);
    expect(operadorPuedeUsarApi("POST", "/api/v1/ventas/batch")).toBe(true);
    expect(operadorPuedeUsarApi("POST", "/api/v1/compras")).toBe(true);
    expect(operadorPuedeUsarApi("POST", "/api/v1/compras/batch")).toBe(true);
  });

  it("puede leer documentos con IA, verificar la factura y dar de alta lo que falte", () => {
    expect(operadorPuedeUsarApi("POST", "/api/v1/ventas/extraer-venta")).toBe(true);
    expect(operadorPuedeUsarApi("POST", "/api/v1/compras/extraer-factura")).toBe(true);
    expect(operadorPuedeUsarApi("GET", "/api/v1/compras/verificar-factura")).toBe(true);
    expect(operadorPuedeUsarApi("POST", "/api/v1/clientes")).toBe(true);
    expect(operadorPuedeUsarApi("POST", "/api/v1/proveedores")).toBe(true);
    expect(operadorPuedeUsarApi("POST", "/api/v1/calibres")).toBe(true);
    expect(operadorPuedeUsarApi("POST", "/api/v1/archivos")).toBe(true);
    expect(operadorPuedeUsarApi("GET", "/api/v1/archivos/facturas/foto.jpg")).toBe(true);
  });

  it("no puede corregir ni anular", () => {
    expect(operadorPuedeUsarApi("PATCH", "/api/v1/ventas/abc")).toBe(false);
    expect(operadorPuedeUsarApi("PUT", "/api/v1/compras/abc")).toBe(false);
    expect(operadorPuedeUsarApi("POST", "/api/v1/ventas/abc/anular")).toBe(false);
    expect(operadorPuedeUsarApi("POST", "/api/v1/compras/abc/anular")).toBe(false);
    expect(operadorPuedeUsarApi("DELETE", "/api/v1/ventas/abc")).toBe(false);
  });

  it("no puede tocar cobros, caja, gastos, fletes, reportes ni usuarios", () => {
    for (const [metodo, ruta] of [
      ["POST", "/api/v1/clientes/abc/cobros"],
      ["GET", "/api/v1/clientes/abc/movimientos"],
      ["GET", "/api/v1/reportes/cierre-mensual"],
      ["POST", "/api/v1/gastos"],
      ["POST", "/api/v1/fletes"],
      ["GET", "/api/v1/flujo-caja"],
      ["GET", "/api/v1/usuarios"],
      ["GET", "/api/v1/alertas"],
      ["POST", "/api/v1/inventario/lotes/abc/ajustar"],
    ] as const) {
      expect(operadorPuedeUsarApi(metodo, ruta), `${metodo} ${ruta}`).toBe(false);
    }
  });
});
