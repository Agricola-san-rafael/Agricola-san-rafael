"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/forms/select-field";
import { todayLocalISODate } from "@/modules/shared/dates";

export function FormularioChofer({ choferes }: { choferes: string[] }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [fecha, setFecha] = useState(todayLocalISODate());
  const [chofer, setChofer] = useState(choferes[0] ?? "");
  const [tipo, setTipo] = useState<"deuda" | "pago">("pago");
  const [monto, setMonto] = useState("");
  const [concepto, setConcepto] = useState("");

  async function guardar() {
    setEnviando(true);
    try {
      const res = await fetch("/api/v1/fletes/choferes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fecha, chofer, tipo, monto: monto.replace(/\./g, "").replace(",", "."), concepto }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "No se pudo registrar");
        return;
      }
      toast.success("Movimiento registrado");
      setMonto("");
      setConcepto("");
      router.refresh();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="grid max-w-2xl gap-3 rounded-md border p-3 sm:grid-cols-2">
      <div className="flex flex-col gap-1">
        <Label>Fecha</Label>
        <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1">
        <Label>Chofer</Label>
        <Input value={chofer} onChange={(e) => setChofer(e.target.value)} list="choferes-conocidos" />
        <datalist id="choferes-conocidos">{choferes.map((c) => <option key={c} value={c} />)}</datalist>
      </div>
      <div className="flex flex-col gap-1">
        <Label>Tipo</Label>
        <SelectField
          value={tipo}
          onValueChange={(v) => setTipo((v ?? "pago") as typeof tipo)}
          options={[
            { value: "pago", label: "Le pagué al chofer" },
            { value: "deuda", label: "Le debo al chofer (sueldo o reembolso)" },
          ]}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label>Monto</Label>
        <Input inputMode="decimal" value={monto} onChange={(e) => setMonto(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1 sm:col-span-2">
        <Label>Concepto</Label>
        <Input value={concepto} onChange={(e) => setConcepto(e.target.value)} placeholder="Ej: pago del viaje a La Serena" />
      </div>
      <Button className="w-fit" onClick={guardar} disabled={enviando}>
        {enviando ? "Guardando..." : "Registrar movimiento"}
      </Button>
    </div>
  );
}
