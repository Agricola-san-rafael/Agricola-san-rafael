"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCLP } from "@/modules/shared/money";

export interface GastoRutaFila {
  id: string;
  descripcion: string;
  monto: number;
}

const num = (s: string) => Number(s.replace(/\./g, "").replace(",", ".")) || 0;

/** Botón en la lista de viajes para ver, agregar y quitar gastos en ruta de un viaje ya registrado. */
export function GastosRutaViaje({
  fleteId,
  recorrido,
  gastos,
  puedeEditar,
}: {
  fleteId: string;
  recorrido: string;
  gastos: GastoRutaFila[];
  puedeEditar: boolean;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [descripcion, setDescripcion] = useState("");
  const [monto, setMonto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const total = gastos.reduce((a, g) => a + g.monto, 0);

  async function agregar() {
    if (!descripcion.trim() || num(monto) <= 0) {
      toast.error("Escribe la descripción y el monto del gasto");
      return;
    }
    setEnviando(true);
    try {
      const res = await fetch(`/api/v1/fletes/${fleteId}/gastos-ruta`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descripcion: descripcion.trim(), monto: num(monto) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "No se pudo agregar el gasto");
        return;
      }
      toast.success("Gasto en ruta agregado");
      setDescripcion("");
      setMonto("");
      router.refresh();
    } finally {
      setEnviando(false);
    }
  }

  async function quitar(gastoId: string) {
    const res = await fetch(`/api/v1/fletes/${fleteId}/gastos-ruta/${gastoId}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("No se pudo quitar el gasto");
      return;
    }
    toast.success("Gasto quitado");
    router.refresh();
  }

  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setAbierto(true)}>
        {gastos.length > 0 ? `Gastos en ruta (${formatCLP(total)})` : "Gastos en ruta"}
      </Button>
      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gastos adicionales en ruta</DialogTitle>
            <DialogDescription>
              {recorrido}. Cada gasto se suma al costo del viaje.
            </DialogDescription>
          </DialogHeader>

          <ul className="flex flex-col gap-2 text-sm">
            {gastos.map((g) => (
              <li key={g.id} className="flex items-center justify-between gap-3">
                <span className="min-w-0 break-words">{g.descripcion}</span>
                <span className="flex items-center gap-2 whitespace-nowrap">
                  {formatCLP(g.monto)}
                  {puedeEditar && (
                    <Button size="sm" variant="ghost" onClick={() => quitar(g.id)}>
                      Quitar
                    </Button>
                  )}
                </span>
              </li>
            ))}
            {gastos.length === 0 && <li className="text-muted-foreground">Este viaje no tiene gastos en ruta.</li>}
            {gastos.length > 0 && (
              <li className="flex justify-between gap-3 border-t pt-2 font-medium">
                <span>Total</span>
                <span>{formatCLP(total)}</span>
              </li>
            )}
          </ul>

          {puedeEditar && (
            <div className="flex flex-col gap-2 border-t pt-3">
              <Label>Agregar gasto</Label>
              <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-2">
                <Input
                  aria-label="Descripción del gasto"
                  placeholder="Ej: almuerzo chofer"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                />
                <Input
                  aria-label="Monto del gasto"
                  inputMode="decimal"
                  placeholder="$"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                />
              </div>
              <Button className="w-fit" onClick={agregar} disabled={enviando}>
                {enviando ? "Guardando..." : "Agregar"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
