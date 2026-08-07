import { z } from "zod";

export const proveedorSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  rut: z.string().trim().min(1).optional().or(z.literal("").transform(() => undefined)),
  contacto: z.string().optional(),
  telefono: z.string().optional(),
  ubicacion: z.string().optional(),
  condicionesPago: z.enum(["contado", "credito"]).optional(),
  plazoPagoDias: z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? undefined : Number(val)),
    z.number().int().min(0).optional()
  ),
  notas: z.string().optional(),
  activo: z.boolean().optional(),
});

export const proveedorUpdateSchema = proveedorSchema.partial();

export type ProveedorInput = z.infer<typeof proveedorSchema>;
export type ProveedorUpdateInput = z.infer<typeof proveedorUpdateSchema>;
