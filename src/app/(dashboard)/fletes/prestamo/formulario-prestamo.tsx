"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/forms/select-field";
import { todayLocalISODate } from "@/modules/shared/dates";

export function FormularioPrestamo() {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [fecha, setFecha] = useState(todayLocalISODate());
  const [tipo, setTipo] = useState<"prestamo" | "devolucion">("prestamo");
  const [monto, setMonto] = useState("");
  const [concepto, setConcepto] = useState("");
  const [referencia, setReferencia] = useState("");

  async function guardar() {
    setEnviando(true);
    try {
      const res = await fetch("/api/v1/prestamo-empresas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fecha, tipo, monto: monto.replace(/\./g, "").replace(",", "."), concepto, referencia }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "No se pudo registrar el movimiento");
        return;
      }
      toast.success("Movimiento registrado");
      setMonto("");
      setConcepto("");
      setReferencia("");
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
        <Label>Tipo</Label>
        <SelectField
          value={tipo}
          onValueChange={(v) => setTipo((v ?? "prestamo") as typeof tipo)}
          options={[
            { value: "prestamo", label: "La agrícola presta al transporte" },
            { value: "devolucion", label: "El transporte devuelve a la agrícola" },
          ]}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label>Monto</Label>
        <Input inputMode="decimal" value={monto} onChange={(e) => setMonto(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1">
        <Label>Referencia (N° de operación)</Label>
        <Input value={referencia} onChange={(e) => setReferencia(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1 sm:col-span-2">
        <Label>Concepto</Label>
        <Input value={concepto} onChange={(e) => setConcepto(e.target.value)} placeholder="Ej: 3° abono del camión Hino" />
      </div>
      <Button className="w-fit" onClick={guardar} disabled={enviando}>
        {enviando ? "Guardando..." : "Registrar movimiento"}
      </Button>
    </div>
  );
}
