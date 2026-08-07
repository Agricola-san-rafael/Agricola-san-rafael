"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { SelectField } from "@/components/forms/select-field";
import { NumericInput } from "@/components/forms/numeric-input";
import { proveedorSchema } from "@/modules/proveedores/schema";
import type { Proveedor } from "@/generated/prisma/client";

type FormInput = z.input<typeof proveedorSchema>;
type FormOutput = z.output<typeof proveedorSchema>;

interface ProveedorFormProps {
  proveedor?: Proveedor;
}

export function ProveedorForm({ proveedor }: ProveedorFormProps) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(proveedorSchema),
    defaultValues: proveedor
      ? {
          nombre: proveedor.nombre,
          rut: proveedor.rut ?? undefined,
          contacto: proveedor.contacto ?? undefined,
          telefono: proveedor.telefono ?? undefined,
          ubicacion: proveedor.ubicacion ?? undefined,
          condicionesPago: proveedor.condicionesPago ?? undefined,
          plazoPagoDias: proveedor.plazoPagoDias ?? undefined,
          notas: proveedor.notas ?? undefined,
          activo: proveedor.activo,
        }
      : { activo: true },
  });

  const condicionesPago = watch("condicionesPago");
  const activo = watch("activo") ?? true;

  async function onSubmit(values: FormOutput) {
    const url = proveedor ? `/api/v1/proveedores/${proveedor.id}` : "/api/v1/proveedores";
    const method = proveedor ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "No se pudo guardar el proveedor");
      return;
    }
    toast.success(proveedor ? "Proveedor actualizado" : "Proveedor creado");
    router.push("/proveedores");
    router.refresh();
  }

  return (
    <form className="flex max-w-lg flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
      <div className="flex flex-col gap-2">
        <Label htmlFor="nombre">Nombre</Label>
        <Input id="nombre" {...register("nombre")} />
        {errors.nombre && <p className="text-sm text-destructive">{errors.nombre.message}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="rut">RUT</Label>
        <Input id="rut" {...register("rut")} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="contacto">Contacto</Label>
        <Input id="contacto" {...register("contacto")} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="telefono">Teléfono</Label>
        <Input id="telefono" type="tel" inputMode="tel" {...register("telefono")} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="ubicacion">Ubicación</Label>
        <Input id="ubicacion" {...register("ubicacion")} />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Condiciones de pago</Label>
        <SelectField
          value={condicionesPago}
          onValueChange={(value) =>
            setValue("condicionesPago", value as "contado" | "credito" | undefined)
          }
          options={[
            { value: "contado", label: "Contado" },
            { value: "credito", label: "Crédito" },
          ]}
        />
      </div>

      {condicionesPago === "credito" && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="plazoPagoDias">Plazo de pago (días)</Label>
          <NumericInput id="plazoPagoDias" {...register("plazoPagoDias")} />
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="notas">Notas</Label>
        <Textarea id="notas" {...register("notas")} />
      </div>

      {proveedor && (
        <div className="flex items-center gap-2">
          <Checkbox
            id="activo"
            checked={activo}
            onCheckedChange={(checked) => setValue("activo", checked === true)}
          />
          <Label htmlFor="activo">Activo</Label>
        </div>
      )}

      <Button type="submit" disabled={isSubmitting} className="mt-2 w-fit">
        {isSubmitting ? "Guardando..." : "Guardar"}
      </Button>
    </form>
  );
}
