import { z } from "zod";

const numeroPositivo = z.preprocess(
  (val) => (val === "" || val === undefined || val === null ? undefined : Number(val)),
  z.number().positive()
);

export const ventaSchema = z.object({
  fecha: z.string().min(1, "La fecha es obligatoria"),
  clienteId: z.string().uuid("Selecciona un cliente"),
  variedadId: z.string().uuid("Selecciona una variedad"),
  calibreId: z.string().uuid("Selecciona un calibre"),
  kilos: numeroPositivo,
  precioKg: numeroPositivo,
  formaPago: z.enum(["contado", "credito"]),
  estadoPago: z.enum(["pagado", "pendiente", "parcial"]),
  tipoDocumento: z.enum(["boleta", "factura", "sin_documento"]),
  nDocumento: z.string().optional(),
  observaciones: z.string().optional(),
  forzarVenta: z.boolean().optional(),
});

export type VentaInput = z.infer<typeof ventaSchema>;
