// La base de datos ordena por bytes (C.UTF-8): las mayúsculas van antes que las minúsculas y las tildes
// ("Ángeles") quedan al final. Los nombres se ordenan aquí, como en un diccionario en español.
const colador = new Intl.Collator("es", { sensitivity: "base" });

export function ordenarPorNombre<T extends { nombre: string }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => colador.compare(a.nombre, b.nombre));
}
