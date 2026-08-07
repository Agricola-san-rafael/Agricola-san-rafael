"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/forms/numeric-input";
import { SelectField } from "@/components/forms/select-field";
import { calibreSchema } from "@/modules/catalogos/schema";
import type { Variedad } from "@/generated/prisma/client";

type FormInput = z.input<typeof calibreSchema>;
type FormOutput = z.output<typeof calibreSchema>;

interface CalibreQuickAddProps {
  variedades: Variedad[];
}

export function CalibreQuickAdd({ variedades }: CalibreQuickAddProps) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(calibreSchema),
    defaultValues: { orden: 0 },
  });

  const variedadId = watch("variedadId");

  async function onSubmit(values: FormOutput) {
    const res = await fetch("/api/v1/calibres", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "No se pudo crear el calibre");
      return;
    }
    toast.success("Calibre creado");
    reset({ orden: 0 });
    router.refresh();
  }

  return (
    <form className="flex flex-wrap items-end gap-2" onSubmit={handleSubmit(onSubmit)}>
      <Input placeholder="Código, ej. 20" {...register("codigo")} className="w-40" />
      <div className="w-48">
        <SelectField
          value={variedadId}
          onValueChange={(value) => setValue("variedadId", value)}
          placeholder="Cualquier variedad"
          options={variedades.map((v) => ({ value: v.id, label: v.nombre }))}
        />
      </div>
      <NumericInput placeholder="Orden" {...register("orden")} className="w-24" />
      <Button type="submit" disabled={isSubmitting}>
        Agregar
      </Button>
    </form>
  );
}
