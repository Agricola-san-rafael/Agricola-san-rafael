"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NumericInput } from "@/components/forms/numeric-input";
import { todayLocalISODate } from "@/modules/shared/dates";

export function AjustarCajaDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [fecha, setFecha] = useState(todayLocalISODate());
  const [monto, setMonto] = useState("");
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function onSubmit() {
    const valor = Number(monto);
    if (!valor || Number.isNaN(valor)) {
      toast.error("Ingresa un monto distinto de 0 (usa negativo para descontar)");
      return;
    }
    if (motivo.trim().length < 3) {
      toast.error("Describe el motivo del ajuste");
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch("/api/v1/flujo-caja/ajuste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fecha, monto: valor, motivo: motivo.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "No se pudo registrar el ajuste");
        return;
      }
      toast.success("Ajuste de caja registrado");
      setOpen(false);
      setMonto("");
      setMotivo("");
      router.refresh();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>Ajustar caja</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajustar caja</DialogTitle>
          <DialogDescription>
            Para un saldo inicial (la plata que ya tenías antes de empezar a usar la app) o
            cualquier diferencia de arqueo. Usa un valor negativo para descontar.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="fecha">Fecha</Label>
            <Input id="fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="monto">Monto ($)</Label>
            <NumericInput
              id="monto"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="2250000"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="motivo">Motivo</Label>
            <Textarea
              id="motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej: saldo inicial de caja al partir con la app"
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="ghost" />}>Cancelar</DialogClose>
          <Button onClick={onSubmit} disabled={enviando}>
            {enviando ? "Guardando..." : "Guardar ajuste"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
