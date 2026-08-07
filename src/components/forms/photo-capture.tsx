"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface PhotoCaptureProps {
  carpeta: "cobros" | "pagos" | "gastos";
  value: string | undefined;
  onChange: (key: string | undefined) => void;
}

/**
 * Captura rápida de foto de comprobante (sección 9: formulario móvil en
 * menos de 3 pasos). `capture="environment"` abre la cámara trasera
 * directamente en móvil en vez del selector de archivos genérico.
 */
export function PhotoCapture({ carpeta, value, onChange }: PhotoCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);

  async function handleFile(file: File) {
    setSubiendo(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("carpeta", carpeta);
    try {
      const res = await fetch("/api/v1/archivos", { method: "POST", body: formData });
      if (!res.ok) throw new Error();
      const data = await res.json();
      onChange(data.key);
      toast.success("Comprobante adjuntado");
    } catch {
      toast.error("No se pudo subir el comprobante");
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={subiendo}
        onClick={() => inputRef.current?.click()}
      >
        {subiendo ? "Subiendo..." : value ? "Cambiar foto" : "Foto de comprobante"}
      </Button>
      {value && (
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange(undefined)}>
          Quitar
        </Button>
      )}
    </div>
  );
}
