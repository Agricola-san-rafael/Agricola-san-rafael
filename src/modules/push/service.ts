import { prisma } from "@/lib/prisma";
import { enviarPush, esSuscripcionInvalida, pushConfigurado, type PushPayload } from "@/lib/push";
import type { SuscripcionPushInput } from "./schema";

export async function guardarSuscripcion(usuarioId: string, input: SuscripcionPushInput) {
  return prisma.pushSubscription.upsert({
    where: { endpoint: input.endpoint },
    update: { usuarioId, p256dh: input.keys.p256dh, auth: input.keys.auth },
    create: {
      usuarioId,
      endpoint: input.endpoint,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
    },
  });
}

export async function eliminarSuscripcion(endpoint: string) {
  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
}

export async function existeSuscripcion(endpoint: string) {
  const suscripcion = await prisma.pushSubscription.findUnique({ where: { endpoint } });
  return suscripcion !== null;
}

/** Envía el payload a todas las suscripciones activas, borrando las que ya no sean válidas. */
export async function enviarPushATodos(payload: PushPayload) {
  if (!pushConfigurado) return { total: 0, enviados: 0 };
  const suscripciones = await prisma.pushSubscription.findMany();
  let enviados = 0;
  for (const suscripcion of suscripciones) {
    try {
      await enviarPush(suscripcion, payload);
      enviados++;
    } catch (error) {
      if (esSuscripcionInvalida(error)) {
        await prisma.pushSubscription.delete({ where: { id: suscripcion.id } });
      }
    }
  }
  return { total: suscripciones.length, enviados };
}
