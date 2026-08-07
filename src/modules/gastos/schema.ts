import { z } from "zod";

const numeroPositivo = z.preprocess(
  (val) => (val === "" || val === undefined || val === null ? undefined : Number(val)),
  z.number().positive()
);

export const gastoSchema = z.object({
  fecha: z.string().min(1, "La fecha es obligatoria"),
  categoria: z.enum(["combustible", "flete", "mano_obra", "embalaje", "servicios", "otro"]),
  descripcion: z.string().optional(),
  pagadoA: z.string().optional(),
  monto: numeroPositivo,
  formaPago: z.enum(["efectivo", "transferencia", "otro"]),
  estadoPago: z.enum(["pagado", "pendiente"]),
  comprobanteUrl: z.string().optional(),
});

export type GastoInput = z.infer<typeof gastoSchema>;
