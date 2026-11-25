import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";

const ID_UNICO = "default";

const numeroOCero = z.preprocess(
  (val) => (val === "" || val === undefined || val === null ? 0 : Number(val)),
  z.number().min(0)
);

export const parametroTransporteSchema = z.object({
  combustiblePorKm: numeroOCero,
  tarifaPorKm: numeroOCero,
  kmPorPeaje: numeroOCero,
  costoPorPeaje: numeroOCero,
});

export type ParametroTransporteInput = z.infer<typeof parametroTransporteSchema>;

export interface ParametrosTransporte {
  combustiblePorKm: number;
  tarifaPorKm: number;
  /** Cada cuántos km (ida y vuelta) se estima un peaje. 0 = sin configurar. */
  kmPorPeaje: number;
  /** Lo que cuesta cada peaje para el camión. 0 = sin configurar. */
  costoPorPeaje: number;
}

/** Tarifas por km configuradas; 0 si todavía no se han configurado. */
export async function obtenerParametrosTransporte(): Promise<ParametrosTransporte> {
  const fila = await prisma.parametroTransporte.findUnique({ where: { id: ID_UNICO } });
  return {
    combustiblePorKm: Number(fila?.combustiblePorKm ?? 0),
    tarifaPorKm: Number(fila?.tarifaPorKm ?? 0),
    kmPorPeaje: Number(fila?.kmPorPeaje ?? 0),
    costoPorPeaje: Number(fila?.costoPorPeaje ?? 0),
  };
}

export async function actualizarParametrosTransporte(
  input: ParametroTransporteInput,
  usuarioId: string
): Promise<ParametrosTransporte> {
  const datos = {
    combustiblePorKm: new Prisma.Decimal(input.combustiblePorKm),
    tarifaPorKm: new Prisma.Decimal(input.tarifaPorKm),
    kmPorPeaje: new Prisma.Decimal(input.kmPorPeaje),
    costoPorPeaje: new Prisma.Decimal(input.costoPorPeaje),
    updatedById: usuarioId,
  };
  const fila = await prisma.parametroTransporte.upsert({
    where: { id: ID_UNICO },
    update: datos,
    create: { id: ID_UNICO, ...datos },
  });
  return {
    combustiblePorKm: Number(fila.combustiblePorKm),
    tarifaPorKm: Number(fila.tarifaPorKm),
    kmPorPeaje: Number(fila.kmPorPeaje),
    costoPorPeaje: Number(fila.costoPorPeaje),
  };
}
