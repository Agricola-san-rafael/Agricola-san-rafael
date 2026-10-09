import { z } from "zod";

const numeroPositivo = z.preprocess(
  (val) => (val === "" || val === undefined || val === null ? undefined : Number(val)),
  z.number().positive()
);

export const cobroSchema = z.object({
  fecha: z.string().min(1, "La fecha es obligatoria"),
  monto: numeroPositivo,
  medioPago: z.enum(["efectivo", "transferencia", "deposito_cajavecina", "mercadopago", "otro"]),
  referencia: z.string().optional(),
  ventaId: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  comprobanteUrl: z.string().optional(),
  /** Cuenta desde la que pagó el cliente (leída del comprobante): se guarda para reconocerlo la próxima vez. */
  cuentaOrigen: z.string().optional(),
  bancoOrigen: z.string().optional(),
});

export type CobroInput = z.infer<typeof cobroSchema>;
