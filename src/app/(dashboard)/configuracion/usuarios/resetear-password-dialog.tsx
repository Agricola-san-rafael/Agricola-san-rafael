"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ResetearPasswordDialogProps {
  usuarioId: string;
  nombre: string;
}

export function ResetearPasswordDialog({ usuarioId, nombre }: ResetearPasswordDialogProps) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function onSubmit() {
    if (password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch(`/api/v1/usuarios/${usuarioId}/resetear-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "No se pudo resetear la contraseña");
        return;
      }
      toast.success(`Contraseña de ${nombre} actualizada`);
      setPassword("");
      setOpen(false);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>Resetear contraseña</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resetear contraseña — {nombre}</DialogTitle>
          <DialogDescription>
            Se reemplaza la contraseña actual. Avísale a la persona la nueva contraseña.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label htmlFor={`nueva-password-${usuarioId}`}>Nueva contraseña</Label>
          <Input
            id={`nueva-password-${usuarioId}`}
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="ghost" />}>Cancelar</DialogClose>
          <Button onClick={onSubmit} disabled={enviando}>
            {enviando ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
