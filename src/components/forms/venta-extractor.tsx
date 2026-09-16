"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { VentaExtraida } from "@/modules/ventas/extraer-venta";

interface VentaExtractorProps {
  onExtraido: (venta: VentaExtraida) => void;
}

/** Lee una venta desde una foto/PDF de factura, o desde un mensaje de texto libre, vía IA. */
export function VentaExtractor({ onExtraido }: VentaExtractorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [texto, setTexto] = useState("");
  const [leyendo, setLeyendo] = useState(false);

  function avisarResultado(data: VentaExtraida) {
    onExtraido(data);
    toast.success(
      data.lineas?.length
        ? `Venta leída: ${data.lineas.length} línea(s) detectada(s)`
        : "No se detectaron líneas de productos — completa el formulario a mano"
    );
  }

  async function handleFile(file: File) {
    setLeyendo(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/v1/ventas/extraer-venta", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo leer la venta");
        return;
      }
      avisarResultado(data as VentaExtraida);
    } catch {
      toast.error("No se pudo leer la venta");
    } finally {
      setLeyendo(false);
    }
  }

  async function handleTexto() {
    if (!texto.trim()) {
      toast.error("Escribe o pega el mensaje de la venta");
      return;
    }
    setLeyendo(true);
    try {
      const res = await fetch("/api/v1/ventas/extraer-venta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo leer la venta");
        return;
      }
      avisarResultado(data as VentaExtraida);
      setTexto("");
    } catch {
      toast.error("No se pudo leer la venta");
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
        {leyendo ? "Leyendo..." : "Cargar foto o PDF de la venta"}
      </Button>

      <p className="text-xs text-muted-foreground">O pega el mensaje donde describes la venta:</p>
      <Textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder='Ej: "Gina contreras 150x2300 segunda 50x2000 descarte"'
        rows={2}
      />
      <Button type="button" variant="outline" size="sm" disabled={leyendo} onClick={handleTexto} className="w-fit">
        {leyendo ? "Leyendo..." : "Leer texto"}
      </Button>

      <p className="text-xs text-muted-foreground">La app va a intentar completar los datos. Siempre revisa antes de guardar.</p>
    </div>
  );
}
