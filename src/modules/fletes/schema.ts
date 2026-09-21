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

export const fleteSchema = z
  .object({
    fecha: z.string().min(1, "La fecha es obligatoria"),
    tipo: z.enum(["compra", "venta", "tercero"]),
    compraId: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
    ventaId: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
    terceroNombre: textoOpcional,
    origen: textoOpcional,
    destino: textoOpcional,
    kilos: montoOpcional,
    vehiculo: textoOpcional,
    costoCombustible: monto,
    costoChofer: monto,
    costoPeajes: monto,
    costoOtros: monto,
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
    if (f.costoCombustible + f.costoChofer + f.costoPeajes + f.costoOtros <= 0 && !f.tarifaCobrada) {
      ctx.addIssue({ code: "custom", path: ["costoCombustible"], message: "Ingresa el costo del viaje o la tarifa cobrada" });
    }
  });

export type FleteInput = z.infer<typeof fleteSchema>;
