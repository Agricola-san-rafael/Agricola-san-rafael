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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NumericInput } from "@/components/forms/numeric-input";

interface VentaEditable {
  id: string;
  fecha: string;
  kilos: number;
  precioKg: number;
  nDocumento: string;
  observaciones: string;
}

export function AccionesVenta({ venta }: { venta: VentaEditable }) {
  const router = useRouter();
  const [abiertoEditar, setAbiertoEditar] = useState(false);
  const [abiertoAnular, setAbiertoAnular] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [fecha, setFecha] = useState(venta.fecha);
  const [kilos, setKilos] = useState(String(venta.kilos));
  const [precioKg, setPrecioKg] = useState(String(venta.precioKg));
  const [nDocumento, setNDocumento] = useState(venta.nDocumento);
  const [observaciones, setObservaciones] = useState(venta.observaciones);
  const [motivo, setMotivo] = useState("");

  async function guardar() {
    setEnviando(true);
    try {
      const res = await fetch(`/api/v1/ventas/${venta.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fecha, kilos, precioKg, nDocumento, observaciones }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "No se pudo corregir la venta");
        return;
      }
      toast.success("Venta corregida");
      setAbiertoEditar(false);
      router.refresh();
    } finally {
      setEnviando(false);
    }
  }

  async function anular() {
    if (motivo.trim().length < 3) {
      toast.error("Describe el motivo");
      return;
    }
    setEnviando(true);
    try {
      const res = await fetch(`/api/v1/ventas/${venta.id}/anular`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo: motivo.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "No se pudo anular la venta");
        return;
      }
      toast.success("Venta anulada");
      router.push("/ventas");
      router.refresh();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex gap-2">
      <Dialog open={abiertoEditar} onOpenChange={setAbiertoEditar}>
        <DialogTrigger render={<Button variant="outline" size="sm" />}>Corregir venta</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Corregir venta</DialogTitle>
            <DialogDescription>
              Si cambias los kilos se ajusta el stock del lote. El total, el margen y el cobro
              automático se recalculan. Para cambiar el cliente, anula la venta y regístrala de nuevo.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor="v-fecha">Fecha</Label>
              <Input id="v-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="v-kilos">Kilos</Label>
              <NumericInput id="v-kilos" value={kilos} onChange={(e) => setKilos(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="v-precio">Precio por kilo</Label>
              <NumericInput id="v-precio" value={precioKg} onChange={(e) => setPrecioKg(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="v-doc">N° de documento</Label>
              <Input id="v-doc" value={nDocumento} onChange={(e) => setNDocumento(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1 sm:col-span-2">
              <Label htmlFor="v-obs">Observaciones</Label>
              <Textarea id="v-obs" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="ghost" />}>Cancelar</DialogClose>
            <Button onClick={guardar} disabled={enviando}>
              {enviando ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={abiertoAnular} onOpenChange={setAbiertoAnular}>
        <DialogTrigger render={<Button variant="destructive" size="sm" />}>Anular venta</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anular venta</DialogTitle>
            <DialogDescription>
              La venta se elimina, los kilos vuelven al lote y se borra el cobro que se creó solo al
              registrarla como pagada. Queda guardada en Auditoría.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1">
            <Label htmlFor="v-motivo">Motivo</Label>
            <Textarea
              id="v-motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej: la venta estaba duplicada"
            />
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="ghost" />}>Cancelar</DialogClose>
            <Button variant="destructive" onClick={anular} disabled={enviando}>
              {enviando ? "Anulando..." : "Anular venta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
