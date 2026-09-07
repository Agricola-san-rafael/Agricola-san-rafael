"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { FacturaExtraida } from "@/modules/compras/extraer-factura";

interface FacturaExtractorProps {
  onExtraido: (factura: FacturaExtraida) => void;
}

/** Sube una foto o PDF de factura y la envía a leer automáticamente vía IA. */
export function FacturaExtractor({ onExtraido }: FacturaExtractorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [leyendo, setLeyendo] = useState(false);

  async function handleFile(file: File) {
    setLeyendo(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/v1/compras/extraer-factura", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo leer la factura");
        return;
      }
      onExtraido(data as FacturaExtraida);
      toast.success(
        data.lineas?.length
          ? `Factura leída: ${data.lineas.length} línea(s) detectada(s)`
          : "Factura leída, pero no se detectaron líneas de productos — completa el formulario a mano"
      );
    } catch {
      toast.error("No se pudo leer la factura");
    } finally {
      setLeyendo(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-dashed p-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.pdf,application/pdf"
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
        disabled={leyendo}
        onClick={() => inputRef.current?.click()}
        className="w-fit"
      >
        {leyendo ? "Leyendo factura..." : "Cargar foto o PDF de factura"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Sube la factura y la app va a intentar completar los datos por ti. Siempre revisa antes de guardar.
      </p>
    </div>
  );
}
