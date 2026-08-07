"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ResolverAlertaButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function marcarResuelta() {
    setLoading(true);
    await fetch(`/api/v1/alertas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: "resuelta" }),
    });
    router.refresh();
    setLoading(false);
  }

  return (
    <Button size="sm" variant="outline" onClick={marcarResuelta} disabled={loading}>
      Marcar resuelta
    </Button>
  );
}
