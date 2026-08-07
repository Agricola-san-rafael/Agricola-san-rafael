"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { SelectField } from "@/components/forms/select-field";
import { NumericInput } from "@/components/forms/numeric-input";
import { clienteSchema } from "@/modules/clientes/schema";
import type { Cliente } from "@/generated/prisma/client";

type FormInput = z.input<typeof clienteSchema>;
type FormOutput = z.output<typeof clienteSchema>;

interface ClienteFormProps {
  cliente?: Cliente;
}

export function ClienteForm({ cliente }: ClienteFormProps) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(clienteSchema),
    defaultValues: cliente
      ? {
          nombre: cliente.nombre,
          rut: cliente.rut ?? undefined,
          contacto: cliente.contacto ?? undefined,
          telefono: cliente.telefono ?? undefined,
          email: cliente.email ?? undefined,
          direccion: cliente.direccion ?? undefined,
          condicionesPago: cliente.condicionesPago ?? undefined,
          plazoPagoDias: cliente.plazoPagoDias ?? undefined,
          activo: cliente.activo,
        }
      : { activo: true },
  });

  const condicionesPago = watch("condicionesPago");
  const activo = watch("activo") ?? true;

  async function onSubmit(values: FormOutput) {
    const url = cliente ? `/api/v1/clientes/${cliente.id}` : "/api/v1/clientes";
    const method = cliente ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "No se pudo guardar el cliente");
      return;
    }
    toast.success(cliente ? "Cliente actualizado" : "Cliente creado");
    router.push("/clientes");
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
        <Label htmlFor="telefono">Teléfono (también para WhatsApp)</Label>
        <Input id="telefono" type="tel" inputMode="tel" {...register("telefono")} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" inputMode="email" {...register("email")} />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="direccion">Dirección</Label>
        <Input id="direccion" {...register("direccion")} />
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

      {cliente && (
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
