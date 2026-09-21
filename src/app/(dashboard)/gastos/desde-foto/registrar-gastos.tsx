"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SelectField } from "@/components/forms/select-field";
import { formatCLP } from "@/modules/shared/money";
import type { GastoExtraido } from "@/modules/gastos/extraer-gasto";

type Categoria = NonNullable<GastoExtraido["categoria"]>;
type FormaPago = NonNullable<GastoExtraido["formaPago"]>;

interface Borrador {
  uid: string;
  archivo: string;
  estado: "leyendo" | "listo" | "error" | "registrado";
  error?: string;
  fecha: string;
  monto: string;
  categoria: Categoria;
  descripcion: string;
  pagadoA: string;
  formaPago: FormaPago;
  estadoPago: "pagado" | "pendiente";
  empresa: "agricola" | "transporte";
  comprobanteUrl?: string;
  duplicado?: { descripcion: string; fecha: string; monto: number } | null;
}

const EMPRESAS = [
  { value: "agricola", label: "Agrícola San Rafael" },
  { value: "transporte", label: "Transportes San Rafael SpA" },
];
const CATEGORIAS = [
  { value: "combustible", label: "Combustible" },
  { value: "flete", label: "Flete" },
  { value: "mano_obra", label: "Mano de obra" },
  { value: "embalaje", label: "Embalaje" },
  { value: "servicios", label: "Servicios" },
  { value: "otro", label: "Otro" },
];
const FORMAS = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "otro", label: "Otro" },
];
const ESTADOS = [
  { value: "pagado", label: "Pagado" },
  { value: "pendiente", label: "Pendiente" },
];

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

export function RegistrarGastos() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [borradores, setBorradores] = useState<Borrador[]>([]);

  function actualizar(uid: string, cambios: Partial<Borrador>) {
    setBorradores((prev) => prev.map((b) => (b.uid === uid ? { ...b, ...cambios } : b)));
  }

  async function procesar(original: File) {
    const uid = crypto.randomUUID();
    setBorradores((prev) => [
      ...prev,
      { uid, archivo: original.name, estado: "leyendo", fecha: "", monto: "", categoria: "otro", descripcion: "", pagadoA: "", formaPago: "efectivo", estadoPago: "pagado", empresa: "agricola" },
    ]);

    const archivo = await reducirImagen(original);
    const formLectura = new FormData();
    formLectura.append("file", archivo);
    const formSubida = new FormData();
    formSubida.append("file", archivo);
    formSubida.append("carpeta", "gastos");

    const [lectura, subida] = await Promise.allSettled([
      fetch("/api/v1/gastos/extraer-boleta", { method: "POST", body: formLectura }).then(async (r) => ({ ok: r.ok, data: await r.json().catch(() => ({})) })),
      fetch("/api/v1/archivos", { method: "POST", body: formSubida }).then((r) => (r.ok ? r.json() : null)),
    ]);

    if (lectura.status !== "fulfilled" || !lectura.value.ok) {
      const mensaje = lectura.status === "fulfilled" ? lectura.value.data.error : undefined;
      actualizar(uid, { estado: "error", error: mensaje ?? "No se pudo leer la boleta" });
      return;
    }
    const { gasto, duplicado } = lectura.value.data as { gasto: GastoExtraido; duplicado: Borrador["duplicado"] };
    actualizar(uid, {
      estado: "listo",
      fecha: gasto.fecha ?? "",
      monto: gasto.monto != null ? String(gasto.monto) : "",
      categoria: gasto.categoria ?? "otro",
      descripcion: gasto.descripcion ?? "",
      pagadoA: gasto.pagadoA ?? "",
      formaPago: gasto.formaPago ?? "efectivo",
      comprobanteUrl: subida.status === "fulfilled" && subida.value ? subida.value.key : undefined,
      duplicado,
    });
  }

  async function registrar(b: Borrador) {
    const monto = Number(b.monto.replace(/\./g, "").replace(",", "."));
    if (!b.fecha || !(monto > 0)) {
      toast.error("Completa fecha y monto");
      return;
    }
    const res = await fetch("/api/v1/gastos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fecha: b.fecha, categoria: b.categoria, descripcion: b.descripcion || undefined, pagadoA: b.pagadoA || undefined,
        monto, formaPago: b.formaPago, estadoPago: b.estadoPago, empresa: b.empresa, comprobanteUrl: b.comprobanteUrl,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "No se pudo registrar el gasto");
      return;
    }
    actualizar(b.uid, { estado: "registrado" });
    toast.success(`Gasto de ${formatCLP(monto)} registrado`);
  }

  return (
    <div className="flex flex-col gap-4">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,.pdf,application/pdf"
        className="hidden"
        onChange={(e) => {
          Array.from(e.target.files ?? []).forEach((f) => void procesar(f));
          e.target.value = "";
        }}
      />
      <Button type="button" className="w-fit" onClick={() => inputRef.current?.click()}>
        Subir fotos de boletas
      </Button>

      {borradores.map((b) => (
        <div key={b.uid} className="flex flex-col gap-3 rounded-md border p-3">
          <p className="text-sm font-medium">{b.archivo}</p>
          {b.estado === "leyendo" && <p className="text-sm text-muted-foreground">Leyendo boleta...</p>}
          {b.estado === "error" && <p className="text-sm text-destructive">{b.error}</p>}
          {b.estado === "registrado" && <p className="text-sm text-green-500">Registrado: {formatCLP(Number(b.monto))}</p>}

          {b.estado === "listo" && (
            <>
              {b.duplicado && (
                <Alert variant="destructive">
                  <AlertDescription>
                    Ya hay un gasto igual ese día: {b.duplicado.descripcion}, {b.duplicado.fecha}, {formatCLP(b.duplicado.monto)}. Puede estar repetido.
                  </AlertDescription>
                </Alert>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <Label>Fecha</Label>
                  <Input type="date" value={b.fecha} onChange={(e) => actualizar(b.uid, { fecha: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1">
                  <Label>Monto</Label>
                  <Input inputMode="decimal" value={b.monto} onChange={(e) => actualizar(b.uid, { monto: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <Label>Empresa</Label>
                  <SelectField value={b.empresa} onValueChange={(v) => actualizar(b.uid, { empresa: (v ?? "agricola") as Borrador["empresa"] })} options={EMPRESAS} />
                </div>
                <div className="flex flex-col gap-1">
                  <Label>Categoría</Label>
                  <SelectField value={b.categoria} onValueChange={(v) => actualizar(b.uid, { categoria: (v ?? "otro") as Categoria })} options={CATEGORIAS} />
                </div>
                <div className="flex flex-col gap-1">
                  <Label>Pagado a</Label>
                  <Input value={b.pagadoA} onChange={(e) => actualizar(b.uid, { pagadoA: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <Label>Descripción</Label>
                  <Input value={b.descripcion} onChange={(e) => actualizar(b.uid, { descripcion: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1">
                  <Label>Forma de pago</Label>
                  <SelectField value={b.formaPago} onValueChange={(v) => actualizar(b.uid, { formaPago: (v ?? "efectivo") as FormaPago })} options={FORMAS} />
                </div>
                <div className="flex flex-col gap-1">
                  <Label>Estado</Label>
                  <SelectField value={b.estadoPago} onValueChange={(v) => actualizar(b.uid, { estadoPago: (v ?? "pagado") as Borrador["estadoPago"] })} options={ESTADOS} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="button" onClick={() => registrar(b)}>
                  {b.duplicado ? "Registrar igual" : "Registrar gasto"}
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
