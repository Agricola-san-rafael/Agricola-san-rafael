"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const num = (s: string) => Number(s.replace(/\./g, "").replace(",", ".")) || 0;

export function FormularioParametros({
  combustiblePorKm,
  tarifaPorKm,
}: {
  combustiblePorKm: number;
  tarifaPorKm: number;
}) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [combustible, setCombustible] = useState(String(combustiblePorKm || ""));
  const [tarifa, setTarifa] = useState(String(tarifaPorKm || ""));

  async function guardar() {
    setEnviando(true);
    try {
      const res = await fetch("/api/v1/fletes/parametros", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ combustiblePorKm: num(combustible), tarifaPorKm: num(tarifa) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "No se pudo guardar");
        return;
      }
      toast.success("Tarifas por km guardadas");
      router.refresh();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-lg font-medium">Tarifas por km</h2>
      <p className="text-sm text-muted-foreground">
        Al registrar un viaje con los km recorridos, se sugiere el costo de combustible y la tarifa a cobrar
        multiplicando por estos valores — se pueden editar en cada viaje si el real fue distinto.
      </p>
      <div className="grid max-w-md gap-3 rounded-md border p-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <Label>Combustible ($/km)</Label>
          <Input inputMode="decimal" value={combustible} onChange={(e) => setCombustible(e.target.value)} placeholder="Ej: 180" />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Tarifa a cobrar ($/km)</Label>
          <Input inputMode="decimal" value={tarifa} onChange={(e) => setTarifa(e.target.value)} placeholder="Ej: 1000" />
        </div>
        <Button className="w-fit sm:col-span-2" onClick={guardar} disabled={enviando}>
          {enviando ? "Guardando..." : "Guardar tarifas"}
        </Button>
      </div>
    </div>
  );
}
