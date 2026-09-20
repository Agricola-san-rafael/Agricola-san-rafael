"use client";

import { toast } from "sonner";
import { Copy, MessageCircle } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

export function BotonesCobro({
  mensaje,
  urlWhatsApp,
}: {
  mensaje: string;
  urlWhatsApp: string | null;
}) {
  async function copiar() {
    try {
      await navigator.clipboard.writeText(mensaje);
      toast.success("Mensaje copiado");
    } catch {
      toast.error("No se pudo copiar el mensaje");
    }
  }

  return (
    <div className="flex justify-end gap-2">
      <Button size="sm" variant="outline" onClick={copiar}>
        <Copy className="size-4" />
        Copiar
      </Button>
      {urlWhatsApp && (
        <a
          href={urlWhatsApp}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ size: "sm" })}
        >
          <MessageCircle className="size-4" />
          WhatsApp
        </a>
      )}
    </div>
  );
}
