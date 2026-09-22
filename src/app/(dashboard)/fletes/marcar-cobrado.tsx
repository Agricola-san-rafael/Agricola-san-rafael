"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { todayLocalISODate } from "@/modules/shared/dates";

export function MarcarCobrado({ id }: { id: string }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);

  async function marcar() {
    setEnviando(true);
    try {
      const res = await fetch(`/api/v1/fletes/${id}/cobrar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fecha: todayLocalISODate() }),
      });
      if (!res.ok) {
        toast.error("No se pudo marcar como cobrado");
        return;
      }
      toast.success("Viaje marcado como cobrado");
      router.refresh();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Button size="sm" variant="outline" onClick={marcar} disabled={enviando}>
      Marcar cobrado
    </Button>
  );
}
