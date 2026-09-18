import webpush from "web-push";
import { env } from "./env";

export const pushConfigurado = Boolean(
  env.VAPID_SUBJECT && env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY,
);

if (pushConfigurado) {
  webpush.setVapidDetails(env.VAPID_SUBJECT!, env.VAPID_PUBLIC_KEY!, env.VAPID_PRIVATE_KEY!);
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

export interface PushKeys {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** Devuelve true si el error indica que la suscripción ya no es válida (410/404) y debe borrarse. */
export function esSuscripcionInvalida(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    (error.statusCode === 404 || error.statusCode === 410)
  );
}

export async function enviarPush(subscription: PushKeys, payload: PushPayload) {
  if (!pushConfigurado) return;
  await webpush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.p256dh, auth: subscription.auth },
    },
    JSON.stringify(payload),
  );
}
