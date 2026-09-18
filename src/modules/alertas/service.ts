import { prisma } from "@/lib/prisma";
import { NotFoundError } from "@/modules/shared/errors";
import { enviarPushATodos } from "@/modules/push/service";
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

/** Envía por push las alertas pendientes y las marca como enviadas. Idempotente: solo toca las que siguen "pendiente". */
export async function enviarAlertasPendientes() {
  const pendientes = await prisma.alerta.findMany({
    where: { estado: "pendiente", canal: "push" },
  });

  let enviadas = 0;
  for (const alerta of pendientes) {
    const resultado = await enviarPushATodos({
      title: "Agrícola San Rafael",
      body: alerta.mensaje ?? "Tienes una alerta nueva",
      url: "/alertas",
    });
    if (resultado.enviados > 0) {
      await prisma.alerta.update({ where: { id: alerta.id }, data: { estado: "enviada" } });
      enviadas++;
    }
  }
  return { enviadas, revisadas: pendientes.length };
}
