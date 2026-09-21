const API = "https://console.neon.tech/api/v2";
const PREFIJO = "respaldo-";

export interface RamaNeon {
  id: string;
  name: string;
  default?: boolean;
  primary?: boolean;
  created_at?: string;
}

export interface OpcionesRespaldoNeon {
  apiKey: string;
  projectId: string;
  /** Cuántas copias diarias se conservan. */
  maxCopias?: number;
  hoy?: Date;
  fetchFn?: typeof fetch;
}

export interface ResultadoRespaldoNeon {
  creada: string;
  eliminadas: string[];
  copiasActuales: number;
}

export function nombreDeCopia(fecha: Date): string {
  return `${PREFIJO}${fecha.toISOString().slice(0, 10)}`;
}

/** Ramas de respaldo que sobran: solo las que empiezan con "respaldo-", nunca la principal, las más viejas primero. */
export function copiasAEliminar(ramas: RamaNeon[], maxCopias: number): RamaNeon[] {
  const copias = ramas
    .filter((r) => r.name.startsWith(PREFIJO) && !r.default && !r.primary)
    .sort((a, b) => a.name.localeCompare(b.name));
  return copias.length > maxCopias ? copias.slice(0, copias.length - maxCopias) : [];
}

async function llamar<T>(fetchFn: typeof fetch, apiKey: string, ruta: string, init?: RequestInit): Promise<T> {
  const res = await fetchFn(`${API}${ruta}`, {
    ...init,
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", Accept: "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const detalle = await res.text().catch(() => "");
    throw new Error(`Neon respondió ${res.status} en ${ruta}: ${detalle.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

export async function listarCopiasNeon(opts: Pick<OpcionesRespaldoNeon, "apiKey" | "projectId" | "fetchFn">): Promise<{ principal: RamaNeon; copias: RamaNeon[] }> {
  const f = opts.fetchFn ?? fetch;
  const { branches } = await llamar<{ branches: RamaNeon[] }>(f, opts.apiKey, `/projects/${opts.projectId}/branches`);
  const principal = branches.find((b) => b.default || b.primary);
  if (!principal) throw new Error("No encontré la rama principal del proyecto en Neon");
  const copias = branches.filter((b) => b.name.startsWith(PREFIJO)).sort((a, b) => b.name.localeCompare(a.name));
  return { principal, copias };
}

/**
 * Crea la copia del día (una rama de la base principal, sin cómputo) y borra las más
 * antiguas. Si crear la copia falla, no borra nada.
 */
export async function ejecutarRespaldoNeon(opts: OpcionesRespaldoNeon): Promise<ResultadoRespaldoNeon> {
  const f = opts.fetchFn ?? fetch;
  const maxCopias = opts.maxCopias ?? 7;
  const nombre = nombreDeCopia(opts.hoy ?? new Date());

  const { principal, copias } = await listarCopiasNeon({ apiKey: opts.apiKey, projectId: opts.projectId, fetchFn: f });
  if (!copias.some((c) => c.name === nombre)) {
    await llamar(f, opts.apiKey, `/projects/${opts.projectId}/branches`, {
      method: "POST",
      body: JSON.stringify({ branch: { name: nombre, parent_id: principal.id } }),
    });
  }

  const { copias: despues } = await listarCopiasNeon({ apiKey: opts.apiKey, projectId: opts.projectId, fetchFn: f });
  const sobran = copiasAEliminar(despues, maxCopias);
  for (const rama of sobran) {
    await llamar(f, opts.apiKey, `/projects/${opts.projectId}/branches/${rama.id}`, { method: "DELETE" });
  }
  return { creada: nombre, eliminadas: sobran.map((r) => r.name), copiasActuales: despues.length - sobran.length };
}
