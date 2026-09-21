import { z } from "zod";

export const anulacionSchema = z.object({
  motivo: z.string().trim().min(3, "Describe el motivo"),
});

/** Prefijo de la referencia de los cobros/pagos que la app crea sola al registrar una venta/compra como pagada. */
export const PREFIJO_PAGO_AUTOMATICO = "Pago registrado automáticamente";
