export const CAUSAS_MERMA = ["perdida_peso", "fruta_mala", "error_conteo", "regalo_muestra"] as const;

export type CausaMermaValor = (typeof CAUSAS_MERMA)[number];

export const ETIQUETA_CAUSA: Record<CausaMermaValor, string> = {
  perdida_peso: "Pérdida de peso",
  fruta_mala: "Fruta mala",
  error_conteo: "Error de balanza o conteo",
  regalo_muestra: "Regalo o muestra",
};
