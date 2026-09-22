import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";

const ID_UNICO = "default";

export const parametroTransporteSchema = z.object({
  combustiblePorKm: z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? 0 : Number(val)),
    z.number().min(0)
  ),
  tarifaPorKm: z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? 0 : Number(val)),
    z.number().min(0)
  ),
});

export type ParametroTransporteInput = z.infer<typeof parametroTransporteSchema>;

export interface ParametrosTransporte {
  combustiblePorKm: number;
  tarifaPorKm: number;
}

/** Tarifas por km configuradas; 0 si todavía no se han configurado. */
export async function obtenerParametrosTransporte(): Promise<ParametrosTransporte> {
  const fila = await prisma.parametroTransporte.findUnique({ where: { id: ID_UNICO } });
  return {
    combustiblePorKm: Number(fila?.combustiblePorKm ?? 0),
    tarifaPorKm: Number(fila?.tarifaPorKm ?? 0),
  };
}

export async function actualizarParametrosTransporte(
  input: ParametroTransporteInput,
  usuarioId: string
): Promise<ParametrosTransporte> {
  const fila = await prisma.parametroTransporte.upsert({
    where: { id: ID_UNICO },
    update: {
      combustiblePorKm: new Prisma.Decimal(input.combustiblePorKm),
      tarifaPorKm: new Prisma.Decimal(input.tarifaPorKm),
      updatedById: usuarioId,
    },
    create: {
      id: ID_UNICO,
      combustiblePorKm: new Prisma.Decimal(input.combustiblePorKm),
      tarifaPorKm: new Prisma.Decimal(input.tarifaPorKm),
      updatedById: usuarioId,
    },
  });
  return { combustiblePorKm: Number(fila.combustiblePorKm), tarifaPorKm: Number(fila.tarifaPorKm) };
}
