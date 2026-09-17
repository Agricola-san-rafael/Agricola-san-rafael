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
import { SelectField } from "@/components/forms/select-field";

const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "operador", label: "Operador" },
  { value: "solo_lectura", label: "Solo lectura" },
];

export function CrearUsuarioDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [rol, setRol] = useState("operador");
  const [password, setPassword] = useState("");
  const [enviando, setEnviando] = useState(false);

  function limpiar() {
    setNombre("");
    setEmail("");
    setTelefono("");
    setRol("operador");
    setPassword("");
  }

  async function onSubmit() {
    if (nombre.trim().length < 2) {
      toast.error("Ingresa el nombre");
      return;
    }
    if (!email.includes("@")) {
      toast.error("Ingresa un email válido");
      return;
    }
    if (password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch("/api/v1/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim(),
          email: email.trim(),
          telefono: telefono.trim() || undefined,
          rol,
          password,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "No se pudo crear el usuario");
        return;
      }
      toast.success("Usuario creado");
      limpiar();
      setOpen(false);
      router.refresh();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>Nuevo usuario</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo usuario</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="nombreUsuario">Nombre</Label>
            <Input id="nombreUsuario" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="emailUsuario">Email</Label>
            <Input
              id="emailUsuario"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="telefonoUsuario">Teléfono (opcional)</Label>
            <Input
              id="telefonoUsuario"
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Rol</Label>
            <SelectField value={rol} onValueChange={(v) => setRol(v ?? "operador")} options={ROLES} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="passwordUsuario">Contraseña inicial</Label>
            <Input
              id="passwordUsuario"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="ghost" />}>Cancelar</DialogClose>
          <Button onClick={onSubmit} disabled={enviando}>
            {enviando ? "Creando..." : "Crear usuario"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
