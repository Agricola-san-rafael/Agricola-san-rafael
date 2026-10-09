import { z } from "zod";

export const ajusteCajaSchema = z.object({
  fecha: z.string().min(1, "La fecha es obligatoria"),
  monto: z.coerce.number().refine((v) => v !== 0, "El ajuste no puede ser 0"),
  motivo: z.string().trim().min(3, "Describe el motivo del ajuste"),
  caja: z.enum(["efectivo", "banco"]).default("efectivo"),
});

export type AjusteCajaInput = z.infer<typeof ajusteCajaSchema>;

export const arqueoSchema = z.object({
  fecha: z.string().min(1, "La fecha es obligatoria"),
  efectivo: z.coerce.number().min(0, "El efectivo no puede ser negativo"),
  // La cuenta corriente puede estar sobregirada, así que el banco sí puede quedar en negativo.
  banco: z.coerce.number(),
});

export type ArqueoInput = z.infer<typeof arqueoSchema>;
