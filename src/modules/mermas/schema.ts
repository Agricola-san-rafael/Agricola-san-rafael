import { z } from "zod";
import { CAUSAS_MERMA } from "./causas";

export const conteoSchema = z.object({
  fecha: z.string().min(1, "La fecha es obligatoria"),
  conteos: z
    .array(
      z.object({
        variedadId: z.string().uuid(),
        calibreId: z.string().uuid(),
        /** Lo que decía el sistema cuando se abrió la pantalla: si cambió mientras se contaba, se rechaza. */
        kilosSistema: z.coerce.number().min(0),
        kilosPesados: z.coerce.number().min(0, "Los kilos pesados no pueden ser negativos"),
        causa: z.enum(CAUSAS_MERMA),
        observaciones: z.string().trim().optional(),
      }),
    )
    .min(1, "No hay nada que registrar"),
});

export type ConteoInput = z.infer<typeof conteoSchema>;
