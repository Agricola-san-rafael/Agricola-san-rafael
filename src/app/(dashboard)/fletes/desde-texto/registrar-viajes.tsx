"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SelectField } from "@/components/forms/select-field";
import { formatCLP } from "@/modules/shared/money";
import { todayLocalISODate } from "@/modules/shared/dates";
import type { ViajeExtraido } from "@/modules/fletes/extraer-viaje";

interface Opcion {
  value: string;
  label: string;
}

type Tipo = "compra" | "venta" | "tercero";

interface Borrador {
  uid: string;
  estado: "listo" | "registrado";
  duplicado: string | null;
  tipo: Tipo;
  operacionId?: string;
  fecha: string;
  tercero: string;
  origen: string;
  destino: string;
  kilos: string;
  chofer: string;
  km: string;
  estadoCobro: "pendiente" | "cobrado";
  nFactura: string;
  totalFacturado: string;
  combustible: string;
  choferCosto: string;
  peajes: string;
  otros: string;
  tarifa: string;
  observaciones: string;
}

const TIPOS = [
  { value: "tercero", label: "Cobrado a un cliente o tercero" },
  { value: "venta", label: "Entrega de una venta" },
  { value: "compra", label: "Transporta una compra" },
];

const num = (s: string) => Number(s.replace(/\./g, "").replace(",", ".")) || 0;
const txt = (n: number | null) => (n == null ? "" : String(n));

function aBorrador(v: ViajeExtraido, duplicado: string | null): Borrador {
  const notas = [v.chofer ? `Chofer: ${v.chofer}.` : "", v.observaciones ?? ""].filter(Boolean).join(" ");
  return {
    uid: crypto.randomUUID(),
    estado: "listo",
    duplicado,
    tipo: "tercero",
    fecha: v.fecha ?? todayLocalISODate(),
    tercero: v.cliente ?? "",
    origen: v.origen ?? "",
    destino: v.destino ?? "",
    kilos: txt(v.kilos),
    chofer: v.chofer ?? "",
    km: txt(v.km),
    estadoCobro: "pendiente",
    nFactura: "",
    totalFacturado: "",
    combustible: txt(v.costoCombustible),
    choferCosto: txt(v.costoChofer),
    peajes: txt(v.costoPeajes),
    otros: txt(v.costoOtros),
    tarifa: txt(v.tarifa),
    observaciones: notas,
  };
}

async function reducirImagen(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const escala = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * escala);
    canvas.height = Math.round(bitmap.height * escala);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    return blob ? new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}

export function RegistrarViajes({ compras, ventas }: { compras: Opcion[]; ventas: Opcion[] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [texto, setTexto] = useState("");
  const [leyendo, setLeyendo] = useState(false);
  const [borradores, setBorradores] = useState<Borrador[]>([]);

  function actualizar(uid: string, cambios: Partial<Borrador>) {
    setBorradores((prev) => prev.map((b) => (b.uid === uid ? { ...b, ...cambios } : b)));
  }

  async function procesar(pedir: () => Promise<Response>) {
    setLeyendo(true);
    try {
      const res = await pedir();
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo leer el viaje");
        return;
      }
      const nuevos = (data.viajes as { viaje: ViajeExtraido; duplicado: string | null }[]).map((x) => aBorrador(x.viaje, x.duplicado));
      if (nuevos.length === 0) {
        toast.error("No encontré ningún viaje en el texto");
        return;
      }
      setBorradores((prev) => [...prev, ...nuevos]);
      toast.success(`${nuevos.length} viaje(s) leído(s)`);
      setTexto("");
    } catch {
      toast.error("No se pudo leer el viaje");
    } finally {
      setLeyendo(false);
    }
  }

  async function leerTexto() {
    if (!texto.trim()) {
      toast.error("Escribe o pega el mensaje del viaje");
      return;
    }
    await procesar(() =>
      fetch("/api/v1/fletes/extraer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texto }) }),
    );
  }

  async function leerArchivo(original: File) {
    const archivo = await reducirImagen(original);
    const form = new FormData();
    form.append("file", archivo);
    await procesar(() => fetch("/api/v1/fletes/extraer", { method: "POST", body: form }));
  }

  async function registrar(b: Borrador) {
    const res = await fetch("/api/v1/fletes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fecha: b.fecha,
        tipo: b.tipo,
        compraId: b.tipo === "compra" ? b.operacionId : undefined,
        ventaId: b.tipo === "venta" ? b.operacionId : undefined,
        terceroNombre: b.tercero,
        origen: b.origen,
        destino: b.destino,
        kilos: b.kilos,
        km: b.km,
        chofer: b.chofer,
        estadoCobro: b.estadoCobro,
        nFactura: b.nFactura,
        totalFacturado: b.totalFacturado ? num(b.totalFacturado) : undefined,
        costoCombustible: num(b.combustible),
        costoChofer: num(b.choferCosto),
        costoPeajes: num(b.peajes),
        costoOtros: num(b.otros),
        tarifaCobrada: b.tarifa ? num(b.tarifa) : undefined,
        observaciones: b.observaciones,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "No se pudo registrar el viaje");
      return;
    }
    actualizar(b.uid, { estado: "registrado" });
    toast.success("Viaje registrado");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded-md border border-dashed p-3">
        <Label>Describe el viaje o los viajes</Label>
        <Textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={4}
          placeholder='Ej: "viaje de ayer Quillota a Quilpué para Matías Donoso, cobré 250 mil, chofer 50 mil, bencina 29 mil, peajes 5.500"'
        />
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={leerTexto} disabled={leyendo}>
            {leyendo ? "Leyendo..." : "Leer texto"}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,.pdf,application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void leerArchivo(f);
              e.target.value = "";
            }}
          />
          <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={leyendo}>
            Subir foto o PDF
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Revisa siempre los datos antes de registrar. Escribe los montos sin IVA.</p>
      </div>

      {borradores.map((b) => (
        <div key={b.uid} className="flex flex-col gap-3 rounded-md border p-3">
          {b.estado === "registrado" ? (
            <p className="text-sm text-green-500">
              Registrado: {b.origen || "?"} → {b.destino || "?"} · costo {formatCLP(num(b.combustible) + num(b.choferCosto) + num(b.peajes) + num(b.otros))}
            </p>
          ) : (
            <>
              {b.duplicado && (
                <Alert variant="destructive">
                  <AlertDescription>Ya hay un viaje con la misma fecha y tarifa ({b.duplicado}). Puede estar repetido.</AlertDescription>
                </Alert>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <Label>Fecha</Label>
                  <Input type="date" value={b.fecha} onChange={(e) => actualizar(b.uid, { fecha: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1">
                  <Label>Tipo de viaje</Label>
                  <SelectField value={b.tipo} onValueChange={(v) => actualizar(b.uid, { tipo: (v ?? "tercero") as Tipo, operacionId: undefined })} options={TIPOS} />
                </div>
                {b.tipo === "compra" && (
                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <Label>Compra transportada</Label>
                    <SelectField value={b.operacionId} onValueChange={(v) => actualizar(b.uid, { operacionId: v })} options={compras} placeholder="Elige la compra" />
                  </div>
                )}
                {b.tipo === "venta" && (
                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <Label>Venta entregada</Label>
                    <SelectField value={b.operacionId} onValueChange={(v) => actualizar(b.uid, { operacionId: v })} options={ventas} placeholder="Elige la venta" />
                  </div>
                )}
                {b.tipo === "tercero" && (
                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <Label>Cliente o tercero que paga</Label>
                    <Input value={b.tercero} onChange={(e) => actualizar(b.uid, { tercero: e.target.value })} />
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  <Label>Origen</Label>
                  <Input value={b.origen} onChange={(e) => actualizar(b.uid, { origen: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1">
                  <Label>Destino</Label>
                  <Input value={b.destino} onChange={(e) => actualizar(b.uid, { destino: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1">
                  <Label>Combustible</Label>
                  <Input inputMode="decimal" value={b.combustible} onChange={(e) => actualizar(b.uid, { combustible: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1">
                  <Label>Chofer</Label>
                  <Input inputMode="decimal" value={b.choferCosto} onChange={(e) => actualizar(b.uid, { choferCosto: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1">
                  <Label>Peajes</Label>
                  <Input inputMode="decimal" value={b.peajes} onChange={(e) => actualizar(b.uid, { peajes: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1">
                  <Label>Otros costos</Label>
                  <Input inputMode="decimal" value={b.otros} onChange={(e) => actualizar(b.uid, { otros: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1">
                  <Label>Tarifa cobrada (sin IVA)</Label>
                  <Input inputMode="decimal" value={b.tarifa} onChange={(e) => actualizar(b.uid, { tarifa: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1">
                  <Label>Kilos (opcional)</Label>
                  <Input inputMode="decimal" value={b.kilos} onChange={(e) => actualizar(b.uid, { kilos: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1">
                  <Label>Chofer</Label>
                  <Input value={b.chofer} onChange={(e) => actualizar(b.uid, { chofer: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1">
                  <Label>Kilómetros</Label>
                  <Input inputMode="decimal" value={b.km} onChange={(e) => actualizar(b.uid, { km: e.target.value })} />
                </div>
                {b.tipo === "tercero" && (
                  <>
                    <div className="flex flex-col gap-1">
                      <Label>Estado del cobro</Label>
                      <SelectField
                        value={b.estadoCobro}
                        onValueChange={(v) => actualizar(b.uid, { estadoCobro: (v ?? "pendiente") as Borrador["estadoCobro"] })}
                        options={[
                          { value: "pendiente", label: "Pendiente de cobro" },
                          { value: "cobrado", label: "Ya cobrado" },
                        ]}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label>N° de factura (opcional)</Label>
                      <Input value={b.nFactura} onChange={(e) => actualizar(b.uid, { nFactura: e.target.value })} />
                    </div>
                    <div className="flex flex-col gap-1 sm:col-span-2">
                      <Label>Total facturado con IVA (opcional)</Label>
                      <Input inputMode="decimal" value={b.totalFacturado} onChange={(e) => actualizar(b.uid, { totalFacturado: e.target.value })} />
                    </div>
                  </>
                )}
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <Label>Observaciones</Label>
                  <Input value={b.observaciones} onChange={(e) => actualizar(b.uid, { observaciones: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="button" onClick={() => registrar(b)}>
                  {b.duplicado ? "Registrar igual" : "Registrar viaje"}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setBorradores((prev) => prev.filter((x) => x.uid !== b.uid))}>
                  Descartar
                </Button>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
