"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { SelectField } from "@/components/forms/select-field";
import { todayLocalISODate } from "@/modules/shared/dates";

export function FormularioCostoFijo() {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [empresa, setEmpresa] = useState<"agricola" | "transporte">("transporte");
  const [concepto, setConcepto] = useState("");
  const [monto, setMonto] = useState("");
  const [dia, setDia] = useState("15");
  const [desde, setDesde] = useState(todayLocalISODate());
  const [pagaAgricola, setPagaAgricola] = useState(false);

  async function guardar() {
    setEnviando(true);
    try {
      const res = await fetch("/api/v1/fletes/costos-fijos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empresa, concepto, monto: monto.replace(/\./g, "").replace(",", "."), diaDelMes: dia, desde, pagadoPorAgricola: pagaAgricola }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "No se pudo guardar el costo");
        return;
      }
      toast.success("Costo fijo guardado");
      setConcepto("");
      setMonto("");
      router.refresh();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="grid max-w-2xl gap-3 rounded-md border p-3 sm:grid-cols-2">
      <div className="flex flex-col gap-1">
        <Label>Empresa</Label>
        <SelectField
          value={empresa}
          onValueChange={(v) => setEmpresa((v ?? "transporte") as typeof empresa)}
          options={[
            { value: "transporte", label: "Transportes San Rafael SpA" },
            { value: "agricola", label: "Agrícola San Rafael" },
          ]}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label>Costo</Label>
        <Input value={concepto} onChange={(e) => setConcepto(e.target.value)} placeholder="Ej: Cuota del crédito del camión" />
      </div>
      <div className="flex flex-col gap-1">
        <Label>Monto mensual</Label>
        <Input inputMode="decimal" value={monto} onChange={(e) => setMonto(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1">
        <Label>Día del mes en que se paga</Label>
        <Input inputMode="numeric" value={dia} onChange={(e) => setDia(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1">
        <Label>Empieza a contar desde</Label>
        <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
      </div>
      {empresa === "transporte" && (
        <div className="flex items-center gap-2 self-end">
          <Checkbox id="paga-agricola" checked={pagaAgricola} onCheckedChange={(c) => setPagaAgricola(c === true)} />
          <Label htmlFor="paga-agricola">Se paga desde la cuenta de la agrícola</Label>
        </div>
      )}
      <Button className="w-fit" onClick={guardar} disabled={enviando}>
        {enviando ? "Guardando..." : "Agregar costo fijo"}
      </Button>
    </div>
  );
}

export function InterruptorCostoFijo({ id, activo }: { id: string; activo: boolean }) {
  const router = useRouter();
  async function cambiar() {
    const res = await fetch(`/api/v1/fletes/costos-fijos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !activo }),
    });
    if (!res.ok) {
      toast.error("No se pudo cambiar");
      return;
    }
    router.refresh();
  }
  return (
    <Button size="sm" variant="ghost" onClick={cambiar}>
      {activo ? "Pausar" : "Reactivar"}
    </Button>
  );
}
