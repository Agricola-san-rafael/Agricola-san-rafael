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

interface CompraEditable {
  id: string;
  fecha: string;
  kilos: number;
  precioKg: number;
  nFactura: string;
  observaciones: string;
}

export function AccionesCompra({ compra }: { compra: CompraEditable }) {
  const router = useRouter();
  const [abiertoEditar, setAbiertoEditar] = useState(false);
  const [abiertoAnular, setAbiertoAnular] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [fecha, setFecha] = useState(compra.fecha);
  const [kilos, setKilos] = useState(String(compra.kilos));
  const [precioKg, setPrecioKg] = useState(String(compra.precioKg));
  const [nFactura, setNFactura] = useState(compra.nFactura);
  const [observaciones, setObservaciones] = useState(compra.observaciones);
  const [motivo, setMotivo] = useState("");

  async function guardar() {
    setEnviando(true);
    try {
      const res = await fetch(`/api/v1/compras/${compra.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fecha, kilos, precioKg, nFactura, observaciones }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "No se pudo corregir la compra");
        return;
      }
      toast.success("Compra corregida");
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
      const res = await fetch(`/api/v1/compras/${compra.id}/anular`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo: motivo.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "No se pudo anular la compra");
        return;
      }
      toast.success("Compra anulada");
      router.push("/compras");
      router.refresh();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex gap-2">
      <Dialog open={abiertoEditar} onOpenChange={setAbiertoEditar}>
        <DialogTrigger render={<Button variant="outline" size="sm" />}>Corregir compra</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Corregir compra</DialogTitle>
            <DialogDescription>
              Los kilos y el precio solo se pueden cambiar mientras el lote no tenga ventas. El total
              y el costo del lote se recalculan.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor="c-fecha">Fecha</Label>
              <Input id="c-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="c-kilos">Kilos</Label>
              <NumericInput id="c-kilos" value={kilos} onChange={(e) => setKilos(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="c-precio">Precio por kilo</Label>
              <NumericInput id="c-precio" value={precioKg} onChange={(e) => setPrecioKg(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="c-fact">N° de factura</Label>
              <Input id="c-fact" value={nFactura} onChange={(e) => setNFactura(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1 sm:col-span-2">
              <Label htmlFor="c-obs">Observaciones</Label>
              <Textarea id="c-obs" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
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
        <DialogTrigger render={<Button variant="destructive" size="sm" />}>Anular compra</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anular compra</DialogTitle>
            <DialogDescription>
              La compra y su lote se eliminan, y se borra el pago que se creó solo al registrarla
              como pagada. Solo se puede si el lote no tiene ventas. Queda guardada en Auditoría.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1">
            <Label htmlFor="c-motivo">Motivo</Label>
            <Textarea
              id="c-motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej: la compra estaba duplicada"
            />
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="ghost" />}>Cancelar</DialogClose>
            <Button variant="destructive" onClick={anular} disabled={enviando}>
              {enviando ? "Anulando..." : "Anular compra"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
