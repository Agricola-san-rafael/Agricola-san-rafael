"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumericInput } from "@/components/forms/numeric-input";
import { SelectField } from "@/components/forms/select-field";
import { PhotoCapture } from "@/components/forms/photo-capture";
import { todayLocalISODate } from "@/modules/shared/dates";
import { cobroSchema } from "@/modules/cobros/schema";

type FormInput = z.input<typeof cobroSchema>;
type FormOutput = z.output<typeof cobroSchema>;

const MEDIOS_PAGO = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "deposito_cajavecina", label: "Depósito CajaVecina" },
  { value: "mercadopago", label: "Mercado Pago" },
  { value: "otro", label: "Otro" },
];

export function CobroForm({ clienteId }: { clienteId: string }) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(cobroSchema),
    defaultValues: { fecha: todayLocalISODate(), medioPago: "efectivo" },
  });

  const medioPago = watch("medioPago");
  const comprobanteUrl = watch("comprobanteUrl");

  async function onSubmit(values: FormOutput) {
    const res = await fetch(`/api/v1/clientes/${clienteId}/cobros`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "No se pudo registrar el cobro");
      return;
    }
    toast.success("Cobro registrado");
    reset({ fecha: todayLocalISODate(), medioPago: "efectivo", comprobanteUrl: undefined });
    router.refresh();
  }

  return (
    <form className="flex flex-wrap items-end gap-2" onSubmit={handleSubmit(onSubmit)}>
      <div className="flex flex-col gap-1">
        <Label htmlFor="fecha-cobro">Fecha</Label>
        <Input id="fecha-cobro" type="date" className="w-40" {...register("fecha")} />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="monto-cobro">Monto</Label>
        <NumericInput id="monto-cobro" className="w-32" {...register("monto")} />
        {errors.monto && <p className="text-sm text-destructive">{errors.monto.message}</p>}
      </div>
      <div className="flex flex-col gap-1">
        <Label>Medio de pago</Label>
        <div className="w-48">
          <SelectField
            value={medioPago}
            onValueChange={(value) => setValue("medioPago", value as FormOutput["medioPago"])}
            options={MEDIOS_PAGO}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="referencia-cobro">Referencia</Label>
        <Input id="referencia-cobro" className="w-40" {...register("referencia")} />
      </div>
      <PhotoCapture
        carpeta="cobros"
        value={comprobanteUrl}
        onChange={(key) => setValue("comprobanteUrl", key)}
      />
      <Button type="submit" disabled={isSubmitting}>
        Registrar cobro
      </Button>
    </form>
  );
}
