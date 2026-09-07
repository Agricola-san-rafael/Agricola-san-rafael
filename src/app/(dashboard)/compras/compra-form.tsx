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
import { NumericInput } from "@/components/forms/numeric-input";
import { SelectField } from "@/components/forms/select-field";
import { FacturaExtractor } from "@/components/forms/factura-extractor";
import { todayLocalISODate } from "@/modules/shared/dates";
import { useOfflineDraft, reintentarAlReconectar } from "@/hooks/useOfflineDraft";
import { compraSchema } from "@/modules/compras/schema";
import type { FacturaExtraida } from "@/modules/compras/extraer-factura";
import type { Calibre, Proveedor, Variedad } from "@/generated/prisma/client";

function normalizar(texto: string): string {
  return texto
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

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
  const [facturaExtraida, setFacturaExtraida] = useState<FacturaExtraida | null>(null);

  function aplicarDatosFactura(factura: FacturaExtraida) {
    if (factura.fecha) setValue("fecha", factura.fecha);
    if (factura.nFactura) setValue("nFactura", factura.nFactura);
    if (factura.neto !== null) setValue("neto", factura.neto);
    if (factura.iva !== null) setValue("iva", factura.iva);

    if (factura.proveedorNombre) {
      const encontrado = proveedores.find((p) => normalizar(p.nombre) === normalizar(factura.proveedorNombre!));
      if (encontrado) setValue("proveedorId", encontrado.id);
      else toast.info(`No encontré al proveedor "${factura.proveedorNombre}" en la lista — selecciónalo a mano`);
    }
  }

  function aplicarLinea(linea: FacturaExtraida["lineas"][number]) {
    const variedadEncontrada = variedades.find((v) => normalizar(v.nombre) === normalizar(linea.variedad));
    if (variedadEncontrada) {
      setValue("variedadId", variedadEncontrada.id);
      const calibreEncontrado = calibres.find(
        (c) =>
          normalizar(c.codigo) === normalizar(linea.calibre) &&
          (!c.variedadId || c.variedadId === variedadEncontrada.id)
      );
      if (calibreEncontrado) setValue("calibreId", calibreEncontrado.id);
      else toast.info(`No encontré el calibre "${linea.calibre}" — selecciónalo a mano`);
    } else {
      toast.info(`No encontré la variedad "${linea.variedad}" — selecciónala a mano`);
    }
    setValue("kilos", linea.kilos);
    setValue("precioKg", linea.precioKg);
  }

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
      <FacturaExtractor
        onExtraido={(factura) => {
          setFacturaExtraida(factura);
          aplicarDatosFactura(factura);
          if (factura.lineas.length === 1) aplicarLinea(factura.lineas[0]);
        }}
      />

      {facturaExtraida && facturaExtraida.lineas.length > 1 && (
        <div className="flex flex-col gap-2 rounded-md border p-3">
          <p className="text-sm font-medium">Se detectaron varias líneas — elige cuál cargar:</p>
          {facturaExtraida.lineas.map((linea, i) => (
            <Button
              key={i}
              type="button"
              variant="outline"
              size="sm"
              className="w-fit justify-start"
              onClick={() => aplicarLinea(linea)}
            >
              {linea.variedad} · {linea.calibre} · {linea.kilos} kg @ ${linea.precioKg}
            </Button>
          ))}
          <p className="text-xs text-muted-foreground">
            Cada línea es una compra distinta — carga una, guárdala, y repite con la siguiente.
          </p>
        </div>
      )}

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
