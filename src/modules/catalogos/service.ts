import { prisma } from "@/lib/prisma";
import { NotFoundError } from "@/modules/shared/errors";
import type { CalibreInput, VariedadInput } from "./schema";

export async function listarVariedades() {
  return prisma.variedad.findMany({ orderBy: { nombre: "asc" } });
}

export async function crearVariedad(input: VariedadInput) {
  return prisma.variedad.create({ data: input });
}

export async function listarCalibres() {
  return prisma.calibre.findMany({
    orderBy: [{ orden: "asc" }, { codigo: "asc" }],
    include: { variedad: true },
  });
}

export async function crearCalibre(input: CalibreInput) {
  if (input.variedadId) {
    const variedad = await prisma.variedad.findUnique({ where: { id: input.variedadId } });
    if (!variedad) throw new NotFoundError("Variedad no encontrada");
  }
  return prisma.calibre.create({ data: input });
}
