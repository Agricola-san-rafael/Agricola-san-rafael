"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function BotonCopiaNeon() {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);

  async function crear() {
    setEnviando(true);
    try {
      const res = await fetch("/api/v1/respaldo/neon", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo crear la copia");
        return;
      }
      toast.success(`Copia creada: ${data.creada}`);
      router.refresh();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Button variant="outline" className="w-fit" onClick={crear} disabled={enviando}>
      {enviando ? "Creando copia..." : "Crear copia ahora en Neon"}
    </Button>
  );
}
