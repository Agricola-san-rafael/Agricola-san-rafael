/**
 * Formatea una columna DATE (sin hora) de Postgres/Prisma, que siempre llega
 * como medianoche UTC. Usar timeZone: "UTC" evita que se corra un día hacia
 * atrás al mostrarla en una zona horaria detrás de UTC (ej. America/Santiago).
 */
export function formatDateCL(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("es-CL", { timeZone: "UTC" });
}

/** Fecha de hoy en la zona horaria local del navegador, como "YYYY-MM-DD" (para <input type="date">). */
export function todayLocalISODate(): string {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

const MS_POR_DIA = 24 * 60 * 60 * 1000;

/**
 * Helpers de aritmética de fechas en UTC explícito, para columnas DATE (que
 * Prisma siempre entrega como medianoche UTC). Evitan el bug de correr un
 * día cuando el proceso corre en una zona horaria detrás de UTC — usar estos
 * en vez de date-fns (startOfDay/addDays/differenceInCalendarDays operan en
 * hora LOCAL del proceso).
 */
export function medianocheUTC(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function sumarDiasUTC(date: Date, dias: number): Date {
  const d = medianocheUTC(date);
  d.setUTCDate(d.getUTCDate() + dias);
  return d;
}

export function diferenciaDiasUTC(a: Date, b: Date): number {
  return Math.round((medianocheUTC(a).getTime() - medianocheUTC(b).getTime()) / MS_POR_DIA);
}
