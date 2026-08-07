"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NumericInput } from "@/components/forms/numeric-input";
import { SelectField } from "@/components/forms/select-field";
import { todayLocalISODate } from "@/modules/shared/dates";
import { useOfflineDraft, reintentarAlReconectar } from "@/hooks/useOfflineDraft";
import { compraSchema } from "@/modules/compras/schema";
import type { Calibre, Proveedor, Variedad } from "@/generated/prisma/client";

type FormInput = z.input<typeof compraSchema>;
type FormOutput = z.output<typeof compraSchema>;

interface CompraFormProps {
  proveedores: Proveedor[];
  variedades: Variedad[];
  calibres: Calibre[];
}

export function CompraForm({ proveedores, variedades, calibres }: CompraFormProps) {
  const router = useRouter();
  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(compraSchema),
    defaultValues: {
      fecha: todayLocalISODate(),
      formaPago: "contado",
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
  const { limpiarBorrador } = useOfflineDraft("borrador-compra", form);

  const proveedorId = watch("proveedorId");
  const variedadId = watch("variedadId");
  const calibreId = watch("calibreId");
  const formaPago = watch("formaPago");
  const estadoPago = watch("estadoPago");

  async function onSubmit(values: FormOutput) {
    let res: Response;
    try {
      res = await fetch("/api/v1/compras", {
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
      toast.error(data.error ?? "No se pudo registrar la compra");
      return;
    }
    toast.success("Compra registrada");
    limpiarBorrador();
    router.push("/compras");
    router.refresh();
  }

  return (
    <form className="flex max-w-lg flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
      <div className="flex flex-col gap-2">
        <Label htmlFor="fecha">Fecha</Label>
        <Input id="fecha" type="date" {...register("fecha")} />
        {errors.fecha && <p className="text-sm text-destructive">{errors.fecha.message}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <Label>Proveedor</Label>
        <SelectField
          value={proveedorId}
          onValueChange={(value) => setValue("proveedorId", value ?? "")}
          options={proveedores.map((p) => ({ value: p.id, label: p.nombre }))}
          placeholder="Selecciona un proveedor"
        />
        {errors.proveedorId && (
          <p className="text-sm text-destructive">{errors.proveedorId.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label>Variedad</Label>
        <SelectField
          value={variedadId}
          onValueChange={(value) => setValue("variedadId", value ?? "")}
          options={variedades.map((v) => ({ value: v.id, label: v.nombre }))}
          placeholder="Selecciona una variedad"
        />
        {errors.variedadId && (
          <p className="text-sm text-destructive">{errors.variedadId.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label>Calibre</Label>
        <SelectField
          value={calibreId}
          onValueChange={(value) => setValue("calibreId", value ?? "")}
          options={calibres
            .filter((c) => !c.variedadId || c.variedadId === variedadId)
            .map((c) => ({ value: c.id, label: c.codigo }))}
          placeholder="Selecciona un calibre"
        />
        {errors.calibreId && (
          <p className="text-sm text-destructive">{errors.calibreId.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="kilos">Kilos</Label>
          <NumericInput id="kilos" {...register("kilos")} />
          {errors.kilos && <p className="text-sm text-destructive">{errors.kilos.message}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="nCajas">N° de cajas (opcional)</Label>
          <NumericInput id="nCajas" {...register("nCajas")} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="precioKg">Precio por kilo (incluye IVA)</Label>
        <NumericInput id="precioKg" {...register("precioKg")} />
        {errors.precioKg && (
          <p className="text-sm text-destructive">{errors.precioKg.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label>Forma de pago</Label>
          <SelectField
            value={formaPago}
            onValueChange={(value) => setValue("formaPago", value as "contado" | "credito")}
            options={[
              { value: "contado", label: "Contado" },
              { value: "credito", label: "Crédito" },
            ]}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Estado de pago</Label>
          <SelectField
            value={estadoPago}
            onValueChange={(value) =>
              setValue("estadoPago", value as "pagado" | "pendiente" | "parcial")
            }
            options={[
              { value: "pagado", label: "Pagado" },
              { value: "pendiente", label: "Pendiente" },
              { value: "parcial", label: "Parcial" },
            ]}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="nFactura">N° de factura (opcional)</Label>
        <Input id="nFactura" {...register("nFactura")} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="neto">Neto (si hay factura)</Label>
          <NumericInput id="neto" {...register("neto")} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="iva">IVA (si hay factura)</Label>
          <NumericInput id="iva" {...register("iva")} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="observaciones">Observaciones</Label>
        <Textarea id="observaciones" {...register("observaciones")} />
      </div>

      <Button type="submit" disabled={isSubmitting} className="mt-2 w-fit">
        {isSubmitting ? "Guardando..." : "Registrar compra"}
      </Button>
    </form>
  );
}
