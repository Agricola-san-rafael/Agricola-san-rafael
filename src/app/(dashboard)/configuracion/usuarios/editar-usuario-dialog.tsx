"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { SelectField } from "@/components/forms/select-field";

const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "operador", label: "Operador" },
  { value: "solo_lectura", label: "Solo lectura" },
];

interface EditarUsuarioDialogProps {
  usuarioId: string;
  nombreActual: string;
  telefonoActual: string | null;
  rolActual: string;
  activoActual: boolean;
}

export function EditarUsuarioDialog({
  usuarioId,
  nombreActual,
  telefonoActual,
  rolActual,
  activoActual,
}: EditarUsuarioDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [nombre, setNombre] = useState(nombreActual);
  const [telefono, setTelefono] = useState(telefonoActual ?? "");
  const [rol, setRol] = useState(rolActual);
  const [activo, setActivo] = useState(activoActual);
  const [enviando, setEnviando] = useState(false);

  async function onSubmit() {
    if (nombre.trim().length < 2) {
      toast.error("Ingresa el nombre");
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch(`/api/v1/usuarios/${usuarioId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim(),
          telefono: telefono.trim() || undefined,
          rol,
          activo,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "No se pudo actualizar el usuario");
        return;
      }
      toast.success("Usuario actualizado");
      setOpen(false);
      router.refresh();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>Editar</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar usuario</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor={`nombre-${usuarioId}`}>Nombre</Label>
            <Input id={`nombre-${usuarioId}`} value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`telefono-${usuarioId}`}>Teléfono</Label>
            <Input
              id={`telefono-${usuarioId}`}
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Rol</Label>
            <SelectField value={rol} onValueChange={(v) => setRol(v ?? rolActual)} options={ROLES} />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id={`activo-${usuarioId}`} checked={activo} onCheckedChange={(c) => setActivo(c === true)} />
            <Label htmlFor={`activo-${usuarioId}`}>Activo (puede iniciar sesión)</Label>
          </div>
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
