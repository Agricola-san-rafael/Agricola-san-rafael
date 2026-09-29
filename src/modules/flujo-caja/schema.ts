import { z } from "zod";

export const ajusteCajaSchema = z.object({
  fecha: z.string().min(1, "La fecha es obligatoria"),
  monto: z.coerce.number().refine((v) => v !== 0, "El ajuste no puede ser 0"),
  motivo: z.string().trim().min(3, "Describe el motivo del ajuste"),
});

export type AjusteCajaInput = z.infer<typeof ajusteCajaSchema>;
