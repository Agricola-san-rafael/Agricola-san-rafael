"use client";

import { useEffect, useRef } from "react";
import { del, get, set } from "idb-keyval";
import { toast } from "sonner";
import type { FieldValues, UseFormReturn } from "react-hook-form";

const DEBOUNCE_MS = 500;

/**
 * Persiste el estado de un formulario de captura rápida en IndexedDB
 * (sección 9: "guardar en borrador local si se pierde conexión, reintentar
 * envío automáticamente"). Restaura el borrador al montar si existe, lo
 * guarda con debounce en cada cambio, y lo limpia al enviar con éxito.
 *
 * IndexedDB (vía idb-keyval) en vez de localStorage: soporta objetos
 * complejos sin serialización manual y no tiene el límite de ~5MB de
 * localStorage, relevante si en el futuro el borrador incluye una foto.
 */
export function useOfflineDraft<T extends FieldValues>(draftKey: string, form: UseFormReturn<T>) {
  const restaurado = useRef(false);

  useEffect(() => {
    if (restaurado.current) return;
    restaurado.current = true;
    get(draftKey).then((borrador) => {
      if (borrador) {
        form.reset(borrador);
        toast.info("Se restauró un borrador que habías dejado sin enviar");
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const subscription = form.watch((values) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        set(draftKey, values).catch(() => {});
      }, DEBOUNCE_MS);
    });
    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  function limpiarBorrador() {
    del(draftKey).catch(() => {});
  }

  return { limpiarBorrador };
}

/**
 * Envuelve un submit para reintentarlo automáticamente al recuperar
 * conexión, en vez de solo mostrar un error cuando `fetch` falla por red.
 */
export function reintentarAlReconectar(reintentar: () => void) {
  function onOnline() {
    toast.info("Conexión recuperada, reintentando envío...");
    reintentar();
    window.removeEventListener("online", onOnline);
  }
  window.addEventListener("online", onOnline);
  toast.error("Sin conexión — se reintentará automáticamente al reconectar");
}
