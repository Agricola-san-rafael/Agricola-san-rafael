"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/** Muestra el comprobante de un cobro o deja adjuntarlo si se registró sin foto. */
export function ComprobanteCobro({ cobroId, comprobanteUrl }: { cobroId: string; comprobanteUrl: string | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);

  async function adjuntar(file: File) {
    setSubiendo(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("carpeta", "cobros");
      const subida = await fetch("/api/v1/archivos", { method: "POST", body: formData });
      if (!subida.ok) throw new Error();
      const { key } = await subida.json();

      const res = await fetch(`/api/v1/cobros/${cobroId}/comprobante`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comprobanteUrl: key }),
      });
      if (!res.ok) throw new Error();
      toast.success("Comprobante adjuntado");
      router.refresh();
    } catch {
      toast.error("No se pudo adjuntar el comprobante");
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.pdf,application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) adjuntar(file);
          e.target.value = "";
        }}
      />
      {comprobanteUrl && (
        <a
          href={`/api/v1/archivos/${comprobanteUrl}`}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-primary hover:underline"
        >
          Ver
        </a>
      )}
      <Button type="button" variant="outline" size="sm" disabled={subiendo} onClick={() => inputRef.current?.click()}>
        {subiendo ? "Subiendo..." : comprobanteUrl ? "Cambiar" : "Adjuntar"}
      </Button>
    </div>
  );
}
