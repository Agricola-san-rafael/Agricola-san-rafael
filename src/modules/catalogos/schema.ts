import { z } from "zod";

export const variedadSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
});

export const calibreSchema = z.object({
  codigo: z.string().min(1, "El código es obligatorio"),
  variedadId: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  orden: z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? undefined : Number(val)),
    z.number().int().min(0).default(0)
  ),
});

export type VariedadInput = z.infer<typeof variedadSchema>;
export type CalibreInput = z.infer<typeof calibreSchema>;
