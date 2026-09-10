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
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NumericInput } from "@/components/forms/numeric-input";

interface AjustarStockDialogProps {
  loteId: string;
  sku: string;
  kilosDisponibles: number;
}

export function AjustarStockDialog({ loteId, sku, kilosDisponibles }: AjustarStockDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [kilosAjuste, setKilosAjuste] = useState("");
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function onSubmit() {
    const valor = Number(kilosAjuste);
    if (!valor || Number.isNaN(valor)) {
      toast.error("Ingresa un ajuste distinto de 0 (usa negativo para descontar)");
      return;
    }
    if (motivo.trim().length < 3) {
      toast.error("Describe el motivo del ajuste");
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch(`/api/v1/inventario/lotes/${loteId}/ajustar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kilosAjuste: valor, motivo: motivo.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "No se pudo ajustar el stock");
        return;
      }
      toast.success(`Stock de ${sku} ajustado`);
      setOpen(false);
      setKilosAjuste("");
      setMotivo("");
      router.refresh();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>Ajustar</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajustar stock — {sku}</DialogTitle>
          <DialogDescription>
            Disponible actual: {kilosDisponibles} kg. Usa un valor negativo para descontar (ej.
            venta no registrada) o positivo para corregir hacia arriba.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="kilosAjuste">Ajuste (kg)</Label>
            <NumericInput
              id="kilosAjuste"
              value={kilosAjuste}
              onChange={(e) => setKilosAjuste(e.target.value)}
              placeholder="-50"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="motivo">Motivo</Label>
            <Textarea
              id="motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej: se vendió y no se registró la venta"
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
