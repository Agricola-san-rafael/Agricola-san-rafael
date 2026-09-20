"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SelectField } from "@/components/forms/select-field";
import { formatCLP } from "@/modules/shared/money";
import { armarReferencia } from "@/modules/cobros/comprobante";
import type { ComprobanteExtraido } from "@/modules/cobros/extraer-comprobante";

interface ClienteOpcion {
  id: string;
  nombre: string;
  saldo: number;
}

type MedioPago = "efectivo" | "transferencia" | "deposito_cajavecina" | "mercadopago" | "otro";

interface Borrador {
  uid: string;
  archivo: string;
  estado: "leyendo" | "listo" | "error" | "registrado";
  error?: string;
  clienteId?: string;
  fecha: string;
  monto: string;
  medioPago: MedioPago;
  referencia: string;
  comprobanteUrl?: string;
  duplicado?: { cliente: string; fecha: string; monto: number } | null;
}

const MEDIOS = [
  { value: "transferencia", label: "Transferencia" },
  { value: "deposito_cajavecina", label: "Depósito CajaVecina" },
  { value: "efectivo", label: "Efectivo" },
  { value: "mercadopago", label: "Mercado Pago" },
  { value: "otro", label: "Otro" },
];

/** Reduce fotos grandes del celular (el lector acepta hasta 5 MB por imagen). */
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
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export function RegistrarPagos({ clientes }: { clientes: ClienteOpcion[] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [borradores, setBorradores] = useState<Borrador[]>([]);

  const opciones = clientes.map((c) => ({
    value: c.id,
    label: c.saldo > 0 ? `${c.nombre} — debe ${formatCLP(c.saldo)}` : c.nombre,
  }));

  function actualizar(uid: string, cambios: Partial<Borrador>) {
    setBorradores((prev) => prev.map((b) => (b.uid === uid ? { ...b, ...cambios } : b)));
  }

  async function procesar(original: File) {
    const uid = crypto.randomUUID();
    setBorradores((prev) => [
      ...prev,
      {
        uid,
        archivo: original.name,
        estado: "leyendo",
        fecha: "",
        monto: "",
        medioPago: "transferencia",
        referencia: "",
      },
    ]);

    const archivo = await reducirImagen(original);
    const formLectura = new FormData();
    formLectura.append("file", archivo);
    const formSubida = new FormData();
    formSubida.append("file", archivo);
    formSubida.append("carpeta", "cobros");

    const [lectura, subida] = await Promise.allSettled([
      fetch("/api/v1/cobros/extraer-comprobante", { method: "POST", body: formLectura }).then(async (r) => ({
        ok: r.ok,
        data: await r.json().catch(() => ({})),
      })),
      fetch("/api/v1/archivos", { method: "POST", body: formSubida }).then((r) => (r.ok ? r.json() : null)),
    ]);

    if (lectura.status !== "fulfilled" || !lectura.value.ok) {
      const mensaje = lectura.status === "fulfilled" ? lectura.value.data.error : undefined;
      actualizar(uid, { estado: "error", error: mensaje ?? "No se pudo leer el comprobante" });
      return;
    }

    const { comprobante, clienteSugeridoId, duplicado } = lectura.value.data as {
      comprobante: ComprobanteExtraido;
      clienteSugeridoId: string | null;
      duplicado: Borrador["duplicado"];
    };
    actualizar(uid, {
      estado: "listo",
      clienteId: clienteSugeridoId ?? undefined,
      fecha: comprobante.fecha ?? "",
      monto: comprobante.monto != null ? String(comprobante.monto) : "",
      medioPago: comprobante.medioPago ?? "transferencia",
      referencia: armarReferencia(comprobante),
      comprobanteUrl: subida.status === "fulfilled" && subida.value ? subida.value.key : undefined,
      duplicado,
    });
  }

  async function registrar(b: Borrador) {
    const monto = Number(b.monto.replace(/\./g, "").replace(",", "."));
    if (!b.clienteId || !b.fecha || !(monto > 0)) {
      toast.error("Completa cliente, fecha y monto");
      return;
    }
    const res = await fetch(`/api/v1/clientes/${b.clienteId}/cobros`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fecha: b.fecha,
        monto,
        medioPago: b.medioPago,
        referencia: b.referencia || undefined,
        comprobanteUrl: b.comprobanteUrl,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "No se pudo registrar el cobro");
      return;
    }
    actualizar(b.uid, { estado: "registrado" });
    toast.success(`Cobro de ${formatCLP(monto)} registrado`);
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
        Subir fotos de comprobantes
      </Button>

      {borradores.map((b) => (
        <div key={b.uid} className="flex flex-col gap-3 rounded-md border p-3">
          <p className="text-sm font-medium">{b.archivo}</p>

          {b.estado === "leyendo" && <p className="text-sm text-muted-foreground">Leyendo comprobante...</p>}
          {b.estado === "error" && <p className="text-sm text-destructive">{b.error}</p>}
          {b.estado === "registrado" && (
            <p className="text-sm text-green-500">Registrado: {formatCLP(Number(b.monto))}</p>
          )}

          {b.estado === "listo" && (
            <>
              {b.duplicado && (
                <Alert variant="destructive">
                  <AlertDescription>
                    Ya hay un cobro con este N° de operación: {b.duplicado.cliente},{" "}
                    {b.duplicado.fecha}, {formatCLP(b.duplicado.monto)}. Puede estar repetido.
                  </AlertDescription>
                </Alert>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <Label>Cliente</Label>
                  <SelectField
                    value={b.clienteId}
                    onValueChange={(v) => actualizar(b.uid, { clienteId: v })}
                    options={opciones}
                    placeholder="Elige el cliente"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label>Fecha</Label>
                  <Input type="date" value={b.fecha} onChange={(e) => actualizar(b.uid, { fecha: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1">
                  <Label>Monto</Label>
                  <Input
                    inputMode="decimal"
                    value={b.monto}
                    onChange={(e) => actualizar(b.uid, { monto: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label>Medio de pago</Label>
                  <SelectField
                    value={b.medioPago}
                    onValueChange={(v) => actualizar(b.uid, { medioPago: (v ?? "otro") as MedioPago })}
                    options={MEDIOS}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label>Referencia</Label>
                  <Input value={b.referencia} onChange={(e) => actualizar(b.uid, { referencia: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="button" onClick={() => registrar(b)}>
                  {b.duplicado ? "Registrar igual" : "Registrar cobro"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setBorradores((prev) => prev.filter((x) => x.uid !== b.uid))}
                >
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
