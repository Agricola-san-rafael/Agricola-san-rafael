export interface ClienteCandidato {
  id: string;
  nombre: string;
  rut: string | null;
  saldo: number;
}

const IGNORADAS = new Set(["spa", "ltda", "limitada", "sa", "eirl", "de", "del", "la", "las", "los"]);

export function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizarRut(rut: string): string {
  return rut.replace(/[.\s-]/g, "").toUpperCase();
}

/**
 * Sugiere a qué cliente corresponde un pago. Primero por RUT exacto; si no,
 * por las palabras del nombre del cliente que aparecen en el nombre de quien
 * paga o en el mensaje. Devuelve null si no hay coincidencia clara.
 */
export function sugerirCliente(
  clientes: ClienteCandidato[],
  pago: { pagadorNombre: string | null; pagadorRut: string | null; glosa: string | null },
): string | null {
  if (pago.pagadorRut) {
    const rut = normalizarRut(pago.pagadorRut);
    const porRut = clientes.filter((c) => c.rut && normalizarRut(c.rut) === rut);
    if (porRut.length === 1) return porRut[0].id;
  }

  const palabras = new Set(
    normalizarTexto([pago.pagadorNombre, pago.glosa].filter(Boolean).join(" ")).split(" "),
  );
  let mejor: { id: string; puntaje: number } | null = null;
  let empate = false;

  for (const c of clientes) {
    const tokens = normalizarTexto(c.nombre)
      .split(" ")
      .filter((t) => t.length >= 3 && !IGNORADAS.has(t));
    if (tokens.length === 0) continue;
    const coinciden = tokens.filter((t) => palabras.has(t)).length;
    if (coinciden === 0 || (coinciden < tokens.length && coinciden < 2)) continue;

    const puntaje = coinciden * 10 + (c.saldo > 0 ? 1 : 0);
    if (!mejor || puntaje > mejor.puntaje) {
      mejor = { id: c.id, puntaje };
      empate = false;
    } else if (puntaje === mejor.puntaje) {
      empate = true;
    }
  }
  return mejor && !empate ? mejor.id : null;
}
