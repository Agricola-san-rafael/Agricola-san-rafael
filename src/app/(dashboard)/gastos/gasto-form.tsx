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
import { useOfflineDraft, reintentarAlReconectar } from "@/hooks/useOfflineDraft";
import { gastoSchema } from "@/modules/gastos/schema";

type FormInput = z.input<typeof gastoSchema>;
type FormOutput = z.output<typeof gastoSchema>;

const CATEGORIAS = [
  { value: "combustible", label: "Combustible" },
  { value: "flete", label: "Flete" },
  { value: "mano_obra", label: "Mano de obra" },
  { value: "embalaje", label: "Embalaje" },
  { value: "servicios", label: "Servicios" },
  { value: "otro", label: "Otro" },
];

export function GastoForm() {
  const router = useRouter();
  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(gastoSchema),
    defaultValues: {
      fecha: todayLocalISODate(),
      categoria: "otro",
      formaPago: "efectivo",
      estadoPago: "pagado",
    },
  });
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = form;
  const { limpiarBorrador } = useOfflineDraft("borrador-gasto", form);

  const categoria = watch("categoria");
  const formaPago = watch("formaPago");
  const estadoPago = watch("estadoPago");
  const comprobanteUrl = watch("comprobanteUrl");

  async function onSubmit(values: FormOutput) {
    let res: Response;
    try {
      res = await fetch("/api/v1/gastos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
    } catch {
      reintentarAlReconectar(() => onSubmit(values));
      return;
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "No se pudo registrar el gasto");
      return;
    }
    toast.success("Gasto registrado");
    limpiarBorrador();
    router.push("/gastos");
    router.refresh();
  }

  return (
    <form className="flex max-w-lg flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
      <div className="flex flex-col gap-2">
        <Label htmlFor="fecha">Fecha</Label>
        <Input id="fecha" type="date" {...register("fecha")} />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Categoría</Label>
        <SelectField
          value={categoria}
          onValueChange={(value) => setValue("categoria", value as FormOutput["categoria"])}
          options={CATEGORIAS}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="descripcion">Descripción</Label>
        <Input id="descripcion" {...register("descripcion")} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="pagadoA">Pagado a</Label>
        <Input id="pagadoA" {...register("pagadoA")} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="monto">Monto</Label>
        <NumericInput id="monto" {...register("monto")} />
        {errors.monto && <p className="text-sm text-destructive">{errors.monto.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label>Forma de pago</Label>
          <SelectField
            value={formaPago}
            onValueChange={(value) => setValue("formaPago", value as FormOutput["formaPago"])}
            options={[
              { value: "efectivo", label: "Efectivo" },
              { value: "transferencia", label: "Transferencia" },
              { value: "otro", label: "Otro" },
            ]}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Estado de pago</Label>
          <SelectField
            value={estadoPago}
            onValueChange={(value) => setValue("estadoPago", value as FormOutput["estadoPago"])}
            options={[
              { value: "pagado", label: "Pagado" },
              { value: "pendiente", label: "Pendiente" },
            ]}
          />
        </div>
      </div>

      <PhotoCapture
        carpeta="gastos"
        value={comprobanteUrl}
        onChange={(key) => setValue("comprobanteUrl", key)}
      />

      <Button type="submit" disabled={isSubmitting} className="mt-2 w-fit">
        {isSubmitting ? "Guardando..." : "Registrar gasto"}
      </Button>
    </form>
  );
}
