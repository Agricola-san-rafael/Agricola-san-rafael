"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, Download, MessageCircle } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/**
 * Un aviso listo para publicar: el texto se puede retocar antes de copiarlo o
 * mandarlo a WhatsApp. Nada se publica solo; el dueño aprueba cada aviso.
 */
export function Aviso({
  titulo,
  ayuda,
  textoInicial,
  whatsapp = false,
}: {
  titulo: string;
  ayuda: string;
  textoInicial: string;
  whatsapp?: boolean;
}) {
  const [texto, setTexto] = useState(textoInicial);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      toast.success("Texto copiado");
    } catch {
      toast.error("No se pudo copiar el texto");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div>
        <p className="font-medium">{titulo}</p>
        <p className="text-sm text-muted-foreground">{ayuda}</p>
      </div>
      <Textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={8} className="font-mono text-sm" />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={copiar}>
          <Copy className="size-4" />
          Copiar
        </Button>
        {whatsapp && (
          <a
            href={`https://wa.me/?text=${encodeURIComponent(texto)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ size: "sm" })}
          >
            <MessageCircle className="size-4" />
            Enviar por WhatsApp
          </a>
        )}
      </div>
    </div>
  );
}

/** Vista previa de la imagen con botones para bajarla en formato estado (vertical) o feed (cuadrado). */
export function ImagenAviso({ tipo, nombre, alt }: { tipo: "stock" | "fletes" | "oferta"; nombre?: string; alt: string }) {
  const base = `/api/v1/publicidad/imagen?tipo=${tipo}${nombre ? `&nombre=${encodeURIComponent(nombre)}` : ""}`;
  return (
    <div className="flex flex-col gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element -- la imagen se genera al vuelo y no pasa por next/image */}
      <img src={`${base}&formato=cuadrado`} alt={alt} className="aspect-square w-full max-w-sm rounded-md border" />
      <div className="flex flex-wrap gap-2">
        <a href={`${base}&formato=estado&descargar=1`} className={buttonVariants({ size: "sm", variant: "outline" })}>
          <Download className="size-4" />
          Imagen para estado
        </a>
        <a href={`${base}&formato=cuadrado&descargar=1`} className={buttonVariants({ size: "sm", variant: "outline" })}>
          <Download className="size-4" />
          Imagen para Instagram
        </a>
      </div>
    </div>
  );
}
