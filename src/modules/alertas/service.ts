import { prisma } from "@/lib/prisma";
import { NotFoundError } from "@/modules/shared/errors";
import type { EstadoAlerta } from "@/generated/prisma/client";

export async function listarAlertas(estado?: EstadoAlerta) {
  return prisma.alerta.findMany({
    where: estado ? { estado } : undefined,
    orderBy: { fechaDisparo: "desc" },
  });
}

export async function contarAlertasPendientes() {
  return prisma.alerta.count({ where: { estado: "pendiente" } });
}

export async function actualizarEstadoAlerta(id: string, estado: EstadoAlerta) {
  const alerta = await prisma.alerta.findUnique({ where: { id } });
  if (!alerta) throw new NotFoundError("Alerta no encontrada");
  return prisma.alerta.update({ where: { id }, data: { estado } });
}
