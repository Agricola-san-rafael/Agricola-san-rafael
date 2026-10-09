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
import { NumericInput } from "@/components/forms/numeric-input";
import { todayLocalISODate } from "@/modules/shared/dates";
import { formatCLP } from "@/modules/shared/money";

function aNumero(texto: string): number | null {
  const limpio = texto.trim().replace(/\./g, "").replace(",", ".");
  if (limpio === "") return null;
  const n = Number(limpio);
  return Number.isNaN(n) ? null : n;
}

function Diferencia({ real, sistema }: { real: number | null; sistema: number }) {
  if (real === null) return null;
  const dif = Math.round((real - sistema) * 100) / 100;
  if (dif === 0) return <p className="text-xs text-green-500">Coincide con la app.</p>;
  return (
    <p className="text-xs text-muted-foreground">
      La app dice {formatCLP(sistema)}: se ajustará {dif > 0 ? "+" : ""}
      {formatCLP(dif)}.
    </p>
  );
}

export function ArqueoDialog({ efectivoSistema, bancoSistema }: { efectivoSistema: number; bancoSistema: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [fecha, setFecha] = useState(todayLocalISODate());
  const [efectivo, setEfectivo] = useState("");
  const [banco, setBanco] = useState("");
  const [enviando, setEnviando] = useState(false);

  const efectivoReal = aNumero(efectivo);
  const bancoReal = aNumero(banco);

  async function onSubmit() {
    if (efectivoReal === null || bancoReal === null || efectivoReal < 0) {
      toast.error("Escribe cuánto hay en efectivo y en el banco (puede ser 0)");
      return;
    }
    setEnviando(true);
    try {
      const res = await fetch("/api/v1/flujo-caja/arqueo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fecha, efectivo: efectivoReal, banco: bancoReal }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "No se pudo registrar el arqueo");
        return;
      }
      toast.success("Arqueo registrado");
      setOpen(false);
      setEfectivo("");
      setBanco("");
      router.refresh();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>Hacer arqueo</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hacer arqueo de caja</DialogTitle>
          <DialogDescription>
            Cuenta la plata que hay de verdad y escribe los dos números. La app crea un ajuste por
            cada diferencia, con el motivo, para que la caja quede igual a la realidad.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="arqueo-fecha">Fecha</Label>
            <Input id="arqueo-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="arqueo-efectivo">Efectivo que hay ($)</Label>
            <NumericInput id="arqueo-efectivo" value={efectivo} onChange={(e) => setEfectivo(e.target.value)} />
            <Diferencia real={efectivoReal} sistema={efectivoSistema} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="arqueo-banco">Saldo en el banco ($, negativo si está sobregirada)</Label>
            <NumericInput id="arqueo-banco" value={banco} onChange={(e) => setBanco(e.target.value)} />
            <Diferencia real={bancoReal} sistema={bancoSistema} />
          </div>
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="ghost" />}>Cancelar</DialogClose>
          <Button onClick={onSubmit} disabled={enviando}>
            {enviando ? "Guardando..." : "Guardar arqueo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
