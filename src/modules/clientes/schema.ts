import { z } from "zod";

export const clienteSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  rut: z.string().optional(),
  contacto: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email().optional().or(z.literal("").transform(() => undefined)),
  direccion: z.string().optional(),
  condicionesPago: z.enum(["contado", "credito"]).optional(),
  plazoPagoDias: z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? undefined : Number(val)),
    z.number().int().min(0).optional()
  ),
  activo: z.boolean().optional(),
});

export const clienteUpdateSchema = clienteSchema.partial();

export type ClienteInput = z.infer<typeof clienteSchema>;
export type ClienteUpdateInput = z.infer<typeof clienteUpdateSchema>;
