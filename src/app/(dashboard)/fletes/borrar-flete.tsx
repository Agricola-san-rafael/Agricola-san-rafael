"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function BorrarFlete({ id }: { id: string }) {
  const router = useRouter();
  const [confirmar, setConfirmar] = useState(false);

  async function borrar() {
    const res = await fetch(`/api/v1/fletes/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("No se pudo borrar el viaje");
      return;
    }
    toast.success("Viaje borrado");
    router.refresh();
  }

  if (!confirmar) {
    return (
      <Button size="sm" variant="ghost" onClick={() => setConfirmar(true)}>
        Borrar
      </Button>
    );
  }
  return (
    <Button size="sm" variant="destructive" onClick={borrar} onBlur={() => setConfirmar(false)}>
      Confirmar
    </Button>
  );
}
