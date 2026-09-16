import { z } from "zod";

export const ajusteCajaSchema = z.object({
  cantidad: z.coerce.number().int().refine((v) => v !== 0, "El ajuste no puede ser 0"),
  motivo: z.string().trim().min(3, "Describe el motivo del ajuste"),
});

export type AjusteCajaInput = z.infer<typeof ajusteCajaSchema>;
