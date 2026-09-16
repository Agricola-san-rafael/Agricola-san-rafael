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

interface AjustarCajaDialogProps {
  tipoCajaId: string;
  nombre: string;
  stockActual: number;
}

export function AjustarCajaDialog({ tipoCajaId, nombre, stockActual }: AjustarCajaDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [cantidad, setCantidad] = useState("");
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function onSubmit() {
    const valor = Number(cantidad);
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
      const res = await fetch(`/api/v1/cajas/${tipoCajaId}/ajustar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cantidad: valor, motivo: motivo.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "No se pudo ajustar el stock");
        return;
      }
      toast.success(`Stock de ${nombre} ajustado`);
      setOpen(false);
      setCantidad("");
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
          <DialogTitle>Ajustar stock — {nombre}</DialogTitle>
          <DialogDescription>
            Stock actual: {stockActual}. Usa un valor negativo para descontar (rotura, pérdida) o
            positivo para sumar (compra de cajas nuevas).
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="cantidadAjuste">Ajuste</Label>
            <NumericInput
              id="cantidadAjuste"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              placeholder="-10"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="motivoCaja">Motivo</Label>
            <Textarea
              id="motivoCaja"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej: se compraron 50 gamelas nuevas"
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
