"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { variedadSchema, type VariedadInput } from "@/modules/catalogos/schema";

export function VariedadQuickAdd() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<VariedadInput>({ resolver: zodResolver(variedadSchema) });

  async function onSubmit(values: VariedadInput) {
    const res = await fetch("/api/v1/variedades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "No se pudo crear la variedad");
      return;
    }
    toast.success("Variedad creada");
    reset();
    router.refresh();
  }

  return (
    <form className="flex items-end gap-2" onSubmit={handleSubmit(onSubmit)}>
      <div className="flex flex-col gap-2">
        <Input placeholder="Ej. Hass" {...register("nombre")} />
      </div>
      <Button type="submit" disabled={isSubmitting}>
        Agregar
      </Button>
    </form>
  );
}
