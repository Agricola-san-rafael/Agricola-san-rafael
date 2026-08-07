import { z } from "zod";

const numeroPositivo = z.preprocess(
  (val) => (val === "" || val === undefined || val === null ? undefined : Number(val)),
  z.number().positive()
);

const numeroOpcional = z.preprocess(
  (val) => (val === "" || val === undefined || val === null ? undefined : Number(val)),
  z.number().optional()
);

export const compraSchema = z.object({
  fecha: z.string().min(1, "La fecha es obligatoria"),
  proveedorId: z.string().uuid("Selecciona un proveedor"),
  variedadId: z.string().uuid("Selecciona una variedad"),
  calibreId: z.string().uuid("Selecciona un calibre"),
  kilos: numeroPositivo,
  nCajas: numeroOpcional,
  precioKg: numeroPositivo,
  formaPago: z.enum(["contado", "credito"]),
  estadoPago: z.enum(["pagado", "pendiente", "parcial"]),
  nFactura: z.string().optional(),
  neto: numeroOpcional,
  iva: numeroOpcional,
  observaciones: z.string().optional(),
});

export const compraUpdateSchema = compraSchema.partial();

export type CompraInput = z.infer<typeof compraSchema>;
export type CompraUpdateInput = z.infer<typeof compraUpdateSchema>;
