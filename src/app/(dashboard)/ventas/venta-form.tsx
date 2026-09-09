"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { NumericInput } from "@/components/forms/numeric-input";
import { SelectField } from "@/components/forms/select-field";
import { todayLocalISODate } from "@/modules/shared/dates";
import { formatCLP } from "@/modules/shared/money";
import { useOfflineDraft, reintentarAlReconectar } from "@/hooks/useOfflineDraft";
import { ventaSchema } from "@/modules/ventas/schema";
import type { obtenerLotesDisponibles } from "@/modules/inventario/service";
import type { Cliente } from "@/generated/prisma/client";

type FormInput = z.input<typeof ventaSchema>;
type FormOutput = z.output<typeof ventaSchema>;
type LoteDisponible = Awaited<ReturnType<typeof obtenerLotesDisponibles>>[number];

interface VentaFormProps {
  clientes: Cliente[];
  lotes: LoteDisponible[];
  esAdmin: boolean;
}

export function VentaForm({ clientes, lotes, esAdmin }: VentaFormProps) {
  const router = useRouter();
  const [kilosFaltantes, setKilosFaltantes] = useState<number | null>(null);
  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(ventaSchema),
    defaultValues: {
      fecha: todayLocalISODate(),
      formaPago: "contado",
      estadoPago: "pagado",
      tipoDocumento: "boleta",
      forzarVenta: false,
    },
  });
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = form;
  const { limpiarBorrador } = useOfflineDraft("borrador-venta", form);

  const clienteId = watch("clienteId");
  const loteId = watch("loteId");
  const loteSeleccionado = lotes.find((l) => l.id === loteId);
  const formaPago = watch("formaPago");
  const estadoPago = watch("estadoPago");
  const tipoDocumento = watch("tipoDocumento");

  async function enviar(values: FormOutput) {
    let res: Response;
    try {
      res = await fetch("/api/v1/ventas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
    } catch {
      // Sin conexión (no un error de validación del servidor): el borrador
      // ya está guardado en IndexedDB, solo falta reintentar el envío.
      reintentarAlReconectar(() => enviar(values));
      return;
    }

    if (res.status === 409) {
      const data = await res.json().catch(() => ({}));
      setKilosFaltantes(typeof data.kilosFaltantes === "number" ? data.kilosFaltantes : 0);
      return;
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "No se pudo registrar la venta");
      return;
    }

    toast.success("Venta registrada");
    limpiarBorrador();
    router.push("/ventas");
    router.refresh();
  }

  async function onSubmit(values: FormOutput) {
    setKilosFaltantes(null);
    await enviar(values);
  }

  async function forzarYReintentar() {
    setValue("forzarVenta", true);
    const values = ventaSchema.parse({ ...getValues(), forzarVenta: true });
    await enviar(values);
  }

  return (
    <form className="flex max-w-lg flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
      <div className="flex flex-col gap-2">
        <Label htmlFor="fecha">Fecha</Label>
        <Input id="fecha" type="date" {...register("fecha")} />
        {errors.fecha && <p className="text-sm text-destructive">{errors.fecha.message}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <Label>Cliente</Label>
        <SelectField
          value={clienteId}
          onValueChange={(value) => setValue("clienteId", value ?? "")}
          options={clientes.map((c) => ({ value: c.id, label: c.nombre }))}
          placeholder="Selecciona un cliente"
        />
        {errors.clienteId && (
          <p className="text-sm text-destructive">{errors.clienteId.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label>Lote (SKU)</Label>
        <SelectField
          value={loteId}
          onValueChange={(value) => setValue("loteId", value ?? "")}
          options={lotes.map((l) => ({
            value: l.id,
            label: `${l.sku} — ${l.variedad.nombre} ${l.calibre.codigo} — ${Number(l.kilosDisponibles)} kg disp. — ${formatCLP(Number(l.costoKg))}/kg — ${l.compra.proveedor.nombre}`,
          }))}
          placeholder="Selecciona el lote a vender"
        />
        {errors.loteId && <p className="text-sm text-destructive">{errors.loteId.message}</p>}
        {loteSeleccionado && (
          <p className="text-xs text-muted-foreground">
            Disponible: {Number(loteSeleccionado.kilosDisponibles)} kg · Costo:{" "}
            {formatCLP(Number(loteSeleccionado.costoKg))}/kg · Ingreso:{" "}
            {new Date(loteSeleccionado.fechaIngreso).toLocaleDateString("es-CL")}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="kilos">Kilos</Label>
          <NumericInput id="kilos" {...register("kilos")} />
          {errors.kilos && <p className="text-sm text-destructive">{errors.kilos.message}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="precioKg">Precio por kilo</Label>
          <NumericInput id="precioKg" {...register("precioKg")} />
          {errors.precioKg && (
            <p className="text-sm text-destructive">{errors.precioKg.message}</p>
          )}
        </div>
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
        <Label>Tipo de documento</Label>
        <SelectField
          value={tipoDocumento}
          onValueChange={(value) =>
            setValue("tipoDocumento", value as "boleta" | "factura" | "sin_documento")
          }
          options={[
            { value: "boleta", label: "Boleta" },
            { value: "factura", label: "Factura" },
            { value: "sin_documento", label: "Sin documento" },
          ]}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="nDocumento">N° de documento (opcional)</Label>
        <Input id="nDocumento" {...register("nDocumento")} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="observaciones">Observaciones</Label>
        <Textarea id="observaciones" {...register("observaciones")} />
      </div>

      {kilosFaltantes !== null && (
        <Alert variant="destructive">
          <AlertTitle>Stock insuficiente</AlertTitle>
          <AlertDescription>
            Faltan {kilosFaltantes} kg en este lote para cubrir la venta.
            {esAdmin
              ? " Como administrador, puedes forzar la venta (el lote quedará en negativo y se generará una alerta de seguimiento)."
              : " Contacta a un administrador si es necesario forzar la venta."}
          </AlertDescription>
          {esAdmin && (
            <div className="mt-3 flex items-center gap-2">
              <Checkbox
                id="forzarVenta"
                checked={watch("forzarVenta") ?? false}
                onCheckedChange={(checked) => setValue("forzarVenta", checked === true)}
              />
              <Label htmlFor="forzarVenta">Forzar venta excediendo el stock</Label>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={forzarYReintentar}
                disabled={isSubmitting}
              >
                Forzar y registrar
              </Button>
            </div>
          )}
        </Alert>
      )}

      <Button type="submit" disabled={isSubmitting} className="mt-2 w-fit">
        {isSubmitting ? "Guardando..." : "Registrar venta"}
      </Button>
    </form>
  );
}
