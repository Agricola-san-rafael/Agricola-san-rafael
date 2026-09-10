import { z } from "zod";

export const ajusteStockSchema = z.object({
  kilosAjuste: z.coerce.number().refine((v) => v !== 0, "El ajuste no puede ser 0"),
  motivo: z.string().trim().min(3, "Describe el motivo del ajuste"),
});

export type AjusteStockInput = z.infer<typeof ajusteStockSchema>;
