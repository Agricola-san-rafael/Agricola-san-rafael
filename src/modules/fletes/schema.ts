import { z } from "zod";

const monto = z.preprocess(
  (val) => (val === "" || val === undefined || val === null ? 0 : Number(val)),
  z.number().min(0)
);

const montoOpcional = z.preprocess(
  (val) => (val === "" || val === undefined || val === null ? undefined : Number(val)),
  z.number().min(0).optional()
);

const textoOpcional = z.string().trim().optional().transform((v) => (v ? v : undefined));

/** Un gasto adicional hecho en el camino (almuerzo, estacionamiento, reparación...). */
export const gastoRutaSchema = z.object({
  descripcion: z.string().trim().min(1, "Describe el gasto").max(200),
  monto: z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? undefined : Number(val)),
    z.number({ message: "Ingresa el monto" }).positive("El monto debe ser mayor a cero"),
  ),
});

export type GastoRutaInput = z.infer<typeof gastoRutaSchema>;

/** Suma de los gastos en ruta, en pesos. */
export function sumarGastosRuta(gastos: { monto: number }[]): number {
  return gastos.reduce((acc, g) => acc + g.monto, 0);
}

export const fleteSchema = z
  .object({
    fecha: z.string().min(1, "La fecha es obligatoria"),
    tipo: z.enum(["compra", "venta", "tercero"]),
    compraId: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
    ventaId: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
    clienteId: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
    terceroNombre: textoOpcional,
    origen: textoOpcional,
    destino: textoOpcional,
    kilos: montoOpcional,
    vehiculo: textoOpcional,
    km: montoOpcional,
    chofer: textoOpcional,
    estadoCobro: z.enum(["pendiente", "cobrado"]).default("pendiente"),
    nFactura: textoOpcional,
    totalFacturado: montoOpcional,
    costoCombustible: monto,
    costoChofer: monto,
    costoPeajes: monto,
    costoOtros: monto,
    gastosRuta: z.array(gastoRutaSchema).default([]),
    tarifaCobrada: montoOpcional,
    observaciones: textoOpcional,
  })
  .superRefine((f, ctx) => {
    if (f.tipo === "compra" && !f.compraId) {
      ctx.addIssue({ code: "custom", path: ["compraId"], message: "Elige la compra que se transportó" });
    }
    if (f.tipo === "venta" && !f.ventaId) {
      ctx.addIssue({ code: "custom", path: ["ventaId"], message: "Elige la venta que se entregó" });
    }
    if (f.tipo === "tercero" && !f.terceroNombre) {
      ctx.addIssue({ code: "custom", path: ["terceroNombre"], message: "Indica para quién es el flete" });
    }
    if (f.tipo === "tercero" && !f.tarifaCobrada) {
      ctx.addIssue({ code: "custom", path: ["tarifaCobrada"], message: "Indica cuánto se cobró" });
    }
    const costo = f.costoCombustible + f.costoChofer + f.costoPeajes + f.costoOtros + sumarGastosRuta(f.gastosRuta);
    if (costo <= 0 && !f.tarifaCobrada) {
      ctx.addIssue({ code: "custom", path: ["costoCombustible"], message: "Ingresa el costo del viaje o la tarifa cobrada" });
    }
  });

export type FleteInput = z.infer<typeof fleteSchema>;
