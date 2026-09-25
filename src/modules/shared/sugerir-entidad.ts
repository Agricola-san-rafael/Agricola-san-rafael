export interface EntidadCandidata {
  id: string;
  nombre: string;
  rut: string | null;
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

export function normalizarRut(rut: string): string {
  return rut.replace(/[.\s-]/g, "").toUpperCase();
}

/**
 * Busca a qué cliente/proveedor ya registrado corresponde un nombre — ej. el
 * que viene en una factura leída por IA, para no crear un duplicado cuando el
 * mismo RUT ya está guardado con otro nombre de fantasía (compartida con el
 * matcher de cobros en espíritu, pero sin el desempate por saldo que solo
 * aplica a pagos). Primero por RUT exacto; si no, por las palabras del
 * nombre que coinciden. Devuelve null si no hay una coincidencia clara.
 */
export function sugerirEntidad(
  candidatos: EntidadCandidata[],
  datos: { nombre: string | null; rut: string | null },
): string | null {
  if (datos.rut) {
    const rut = normalizarRut(datos.rut);
    const porRut = candidatos.filter((c) => c.rut && normalizarRut(c.rut) === rut);
    if (porRut.length === 1) return porRut[0].id;
  }

  if (!datos.nombre) return null;
  const palabras = new Set(normalizarTexto(datos.nombre).split(" "));
  let mejor: { id: string; puntaje: number } | null = null;
  let empate = false;

  for (const c of candidatos) {
    const tokens = normalizarTexto(c.nombre)
      .split(" ")
      .filter((t) => t.length >= 3 && !IGNORADAS.has(t));
    if (tokens.length === 0) continue;
    const coinciden = tokens.filter((t) => palabras.has(t)).length;
    if (coinciden === 0 || (coinciden < tokens.length && coinciden < 2)) continue;

    const puntaje = coinciden;
    if (!mejor || puntaje > mejor.puntaje) {
      mejor = { id: c.id, puntaje };
      empate = false;
    } else if (puntaje === mejor.puntaje) {
      empate = true;
    }
  }
  return mejor && !empate ? mejor.id : null;
}
