"use client";

import { useEffect } from "react";

const INTERVALO_MS = 10 * 60 * 1000; // access token dura 15m; refresca cada 10m

/** Mantiene la sesión viva mientras el usuario tenga la app abierta, llamando
 * a /api/v1/auth/refresh antes de que expire el access token. */
export function SessionRefresher() {
  useEffect(() => {
    const id = setInterval(() => {
      fetch("/api/v1/auth/refresh", { method: "POST" }).catch(() => {});
    }, INTERVALO_MS);
    return () => clearInterval(id);
  }, []);

  return null;
}
