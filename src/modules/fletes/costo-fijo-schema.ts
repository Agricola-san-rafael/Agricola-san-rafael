import { z } from "zod";

export const costoFijoSchema = z.object({
  empresa: z.enum(["agricola", "transporte"]).default("transporte"),
  concepto: z.string().trim().min(3, "Describe el costo"),
  categoria: z.enum(["combustible", "flete", "mano_obra", "embalaje", "servicios", "otro"]).default("otro"),
  monto: z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().positive("El monto debe ser mayor a 0")),
  diaDelMes: z.preprocess((v) => Number(v), z.number().int().min(1).max(31)),
  desde: z.string().min(1, "Indica desde cuándo"),
  pagadoPorAgricola: z.boolean().default(false),
});
