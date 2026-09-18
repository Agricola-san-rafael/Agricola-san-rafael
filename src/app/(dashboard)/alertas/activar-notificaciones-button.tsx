"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Bell, BellOff } from "lucide-react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

type Estado = "cargando" | "no-soportado" | "activo" | "inactivo";

export function ActivarNotificacionesButton() {
  const [estado, setEstado] = useState<Estado>("cargando");

  useEffect(() => {
    async function verificar() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setEstado("no-soportado");
        return;
      }
      const registro = await navigator.serviceWorker.register("/sw.js");
      const suscripcion = await registro.pushManager.getSubscription();
      setEstado(suscripcion ? "activo" : "inactivo");
    }
    verificar().catch(() => setEstado("no-soportado"));
  }, []);

  async function activar() {
    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") {
        toast.error("No diste permiso para las notificaciones");
        return;
      }
      const registro = await navigator.serviceWorker.ready;
      const res = await fetch("/api/v1/push/vapid-public-key");
      if (!res.ok) {
        toast.error("Las notificaciones aún no están disponibles");
        return;
      }
      const { publicKey } = await res.json();
      const suscripcion = await registro.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      await fetch("/api/v1/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(suscripcion.toJSON()),
      });
      setEstado("activo");
      toast.success("Notificaciones activadas");
    } catch {
      toast.error("No se pudo activar las notificaciones");
    }
  }

  async function desactivar() {
    try {
      const registro = await navigator.serviceWorker.ready;
      const suscripcion = await registro.pushManager.getSubscription();
      if (suscripcion) {
        await fetch("/api/v1/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: suscripcion.endpoint }),
        });
        await suscripcion.unsubscribe();
      }
      setEstado("inactivo");
      toast.success("Notificaciones desactivadas");
    } catch {
      toast.error("No se pudo desactivar las notificaciones");
    }
  }

  if (estado === "cargando" || estado === "no-soportado") return null;

  if (estado === "activo") {
    return (
      <Button variant="outline" size="sm" onClick={desactivar}>
        <BellOff className="size-4" />
        Desactivar notificaciones
      </Button>
    );
  }

  return (
    <Button variant="outline" size="sm" onClick={activar}>
      <Bell className="size-4" />
      Activar notificaciones
    </Button>
  );
}
