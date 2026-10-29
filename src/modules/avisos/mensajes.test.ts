import { describe, expect, it } from "vitest";
import { armarAvisoClienteNuevo, armarAvisoFleteNuevo } from "./mensajes";

const autor = { nombre: "Tomás Espinoza", email: "tomas@example.com" };
const ahora = new Date("2026-10-28T19:45:00Z");

describe("armarAvisoClienteNuevo", () => {
  const aviso = armarAvisoClienteNuevo(
    { nombre: "Ángeles", rut: null, telefono: "+56 9 1234 5678", email: null, empresa: "agricola" },
    autor,
    ahora,
  );

  it("pone el nombre del cliente en el asunto", () => {
    expect(aviso.subject).toBe("Nuevo cliente: Ángeles");
  });
  it("incluye empresa, teléfono y quién lo creó", () => {
    expect(aviso.text).toContain("Empresa: Agrícola San Rafael");
    expect(aviso.text).toContain("Teléfono: +56 9 1234 5678");
    expect(aviso.text).toContain("Creado por: Tomás Espinoza (tomas@example.com)");
  });
  it("omite los datos que no se informaron", () => {
    expect(aviso.text).not.toContain("RUT:");
    expect(aviso.text).not.toContain("Correo:");
  });
  it("muestra la fecha en hora de Chile", () => {
    expect(aviso.text).toContain("Fecha: 28-10-2026, 16:45");
  });
});

describe("armarAvisoFleteNuevo", () => {
  const aviso = armarAvisoFleteNuevo(
    {
      fecha: new Date("2026-10-27T00:00:00Z"),
      tipo: "tercero",
      terceroNombre: "Betta Hermanos",
      origen: "El Melón",
      destino: "Quillota",
      kilos: 5000,
      tarifaCobrada: { toNumber: () => 95000 },
      costoTotal: { toNumber: () => 60000 },
      observaciones: null,
    },
    autor,
    ahora,
  );

  it("pone la ruta y la fecha del viaje en el asunto", () => {
    expect(aviso.subject).toBe("Nuevo viaje: El Melón → Quillota (27-10-2026)");
  });
  it("incluye cliente, kilos, tarifa y costo", () => {
    expect(aviso.text).toContain("Cliente: Betta Hermanos");
    expect(aviso.text).toContain("Kilos: 5000 kg");
    expect(aviso.text).toMatch(/Tarifa cobrada: \$\s?95\.000/);
    expect(aviso.text).toMatch(/Costo del viaje: \$\s?60\.000/);
    expect(aviso.text).toContain("Registrado por: Tomás Espinoza (tomas@example.com)");
  });
  it("sin ruta usa el tipo de viaje en el asunto y omite lo que falta", () => {
    const sinRuta = armarAvisoFleteNuevo(
      { fecha: new Date("2026-10-27T00:00:00Z"), tipo: "compra", terceroNombre: null, origen: null, destino: null, kilos: null, tarifaCobrada: null, costoTotal: 0, observaciones: null },
      autor,
      ahora,
    );
    expect(sinRuta.subject).toBe("Nuevo viaje: Fruta que llega (compra) (27-10-2026)");
    expect(sinRuta.text).not.toContain("Ruta:");
    expect(sinRuta.text).not.toContain("Tarifa cobrada:");
  });
});
