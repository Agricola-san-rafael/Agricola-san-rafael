"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SelectField } from "@/components/forms/select-field";
import { todayLocalISODate } from "@/modules/shared/dates";
import { formatCLP } from "@/modules/shared/money";

interface Opcion {
  value: string;
  label: string;
}

const TIPOS = [
  { value: "compra", label: "Transporta una compra (fruta que llega)" },
  { value: "venta", label: "Entrega una venta" },
  { value: "tercero", label: "Flete para un tercero" },
];

const num = (s: string) => Number(s.replace(/\./g, "").replace(",", ".")) || 0;

export function FleteForm({ compras, ventas }: { compras: Opcion[]; ventas: Opcion[] }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [tipo, setTipo] = useState<"compra" | "venta" | "tercero">("venta");
  const [fecha, setFecha] = useState(todayLocalISODate());
  const [operacionId, setOperacionId] = useState<string | undefined>();
  const [tercero, setTercero] = useState("");
  const [origen, setOrigen] = useState("");
  const [destino, setDestino] = useState("");
  const [kilos, setKilos] = useState("");
  const [vehiculo, setVehiculo] = useState("");
  const [combustible, setCombustible] = useState("");
  const [chofer, setChofer] = useState("");
  const [peajes, setPeajes] = useState("");
  const [otros, setOtros] = useState("");
  const [tarifa, setTarifa] = useState("");
  const [observaciones, setObservaciones] = useState("");

  const costoTotal = num(combustible) + num(chofer) + num(peajes) + num(otros);

  async function guardar() {
    setEnviando(true);
    try {
      const res = await fetch("/api/v1/fletes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fecha, tipo,
          compraId: tipo === "compra" ? operacionId : undefined,
          ventaId: tipo === "venta" ? operacionId : undefined,
          terceroNombre: tercero, origen, destino, kilos, vehiculo,
          costoCombustible: num(combustible), costoChofer: num(chofer), costoPeajes: num(peajes), costoOtros: num(otros),
          tarifaCobrada: tarifa ? num(tarifa) : undefined, observaciones,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "No se pudo registrar el viaje");
        return;
      }
      toast.success("Viaje registrado");
      router.push("/fletes");
      router.refresh();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <Label>Fecha</Label>
          <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Tipo de viaje</Label>
          <SelectField
            value={tipo}
            onValueChange={(v) => { setTipo((v ?? "venta") as typeof tipo); setOperacionId(undefined); }}
            options={TIPOS}
          />
        </div>

        {tipo === "compra" && (
          <div className="flex flex-col gap-1 sm:col-span-2">
            <Label>Compra transportada</Label>
            <SelectField value={operacionId} onValueChange={setOperacionId} options={compras} placeholder="Elige la compra" />
          </div>
        )}
        {tipo === "venta" && (
          <div className="flex flex-col gap-1 sm:col-span-2">
            <Label>Venta entregada</Label>
            <SelectField value={operacionId} onValueChange={setOperacionId} options={ventas} placeholder="Elige la venta" />
          </div>
        )}
        {tipo === "tercero" && (
          <div className="flex flex-col gap-1 sm:col-span-2">
            <Label>Flete para</Label>
            <Input value={tercero} onChange={(e) => setTercero(e.target.value)} placeholder="Nombre de la empresa o persona" />
          </div>
        )}

        <div className="flex flex-col gap-1">
          <Label>Origen</Label>
          <Input value={origen} onChange={(e) => setOrigen(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Destino</Label>
          <Input value={destino} onChange={(e) => setDestino(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Kilos transportados</Label>
          <Input inputMode="decimal" value={kilos} onChange={(e) => setKilos(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Camión o patente</Label>
          <Input value={vehiculo} onChange={(e) => setVehiculo(e.target.value)} />
        </div>
      </div>

      <div className="rounded-md border p-3">
        <p className="mb-2 text-sm font-medium">Costo real del viaje</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <Label>Combustible</Label>
            <Input inputMode="decimal" value={combustible} onChange={(e) => setCombustible(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <Label>Chofer</Label>
            <Input inputMode="decimal" value={chofer} onChange={(e) => setChofer(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <Label>Peajes</Label>
            <Input inputMode="decimal" value={peajes} onChange={(e) => setPeajes(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <Label>Otros</Label>
            <Input inputMode="decimal" value={otros} onChange={(e) => setOtros(e.target.value)} />
          </div>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">Costo total del viaje: {formatCLP(costoTotal)}</p>
      </div>

      <div className="flex flex-col gap-1">
        <Label>{tipo === "tercero" ? "Tarifa cobrada al tercero" : "Tarifa que cobra el transporte a la agrícola (opcional)"}</Label>
        <Input inputMode="decimal" value={tarifa} onChange={(e) => setTarifa(e.target.value)} />
        {tipo !== "tercero" && (
          <p className="text-xs text-muted-foreground">
            Si la dejas vacía, a la operación se le suma el costo real del viaje. Si la ingresas, se le suma la tarifa.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <Label>Observaciones</Label>
        <Textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
      </div>

      <Button className="w-fit" onClick={guardar} disabled={enviando}>
        {enviando ? "Guardando..." : "Registrar viaje"}
      </Button>
    </div>
  );
}
