"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { NumericInput } from "@/components/forms/numeric-input";
import { SelectField } from "@/components/forms/select-field";
import { FacturaExtractor } from "@/components/forms/factura-extractor";
import { todayLocalISODate, formatDateCL } from "@/modules/shared/dates";
import { formatCLP } from "@/modules/shared/money";
import { useOfflineDraft, reintentarAlReconectar } from "@/hooks/useOfflineDraft";
import { compraSchema } from "@/modules/compras/schema";
import type { FacturaExtraida } from "@/modules/compras/extraer-factura";
import type { CompraDuplicada } from "@/modules/compras/service";
import type { Calibre, Proveedor, Variedad } from "@/generated/prisma/client";

function normalizar(texto: string): string {
  return texto
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function normalizarRut(rut: string): string {
  return rut.trim().toUpperCase().replace(/[.\s]/g, "");
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
  const [facturasDuplicadas, setFacturasDuplicadas] = useState<CompraDuplicada[]>([]);
  const [registrandoLote, setRegistrandoLote] = useState(false);

  function aplicarDatosFactura(factura: FacturaExtraida) {
    if (factura.fecha) setValue("fecha", factura.fecha);
    if (factura.nFactura) setValue("nFactura", factura.nFactura);
    if (factura.neto !== null) setValue("neto", factura.neto);
    if (factura.iva !== null) setValue("iva", factura.iva);

    if (factura.proveedorRut || factura.proveedorNombre) {
      const porRut = factura.proveedorRut
        ? proveedores.find((p) => p.rut && normalizarRut(p.rut) === normalizarRut(factura.proveedorRut!))
        : undefined;
      const encontrado =
        porRut ??
        (factura.proveedorNombre
          ? proveedores.find((p) => normalizar(p.nombre) === normalizar(factura.proveedorNombre!))
          : undefined);
      if (encontrado) setValue("proveedorId", encontrado.id);
      else toast.info(`No encontré al proveedor "${factura.proveedorNombre}" en la lista — selecciónalo a mano`);
    }
  }

  function resolverVariedadCalibre(
    linea: FacturaExtraida["lineas"][number]
  ): { variedadId: string; calibreId: string } | null {
    const variedadEncontrada = variedades.find((v) => normalizar(v.nombre) === normalizar(linea.variedad));
    if (!variedadEncontrada) return null;
    const calibreEncontrado = calibres.find(
      (c) =>
        normalizar(c.codigo) === normalizar(linea.calibre) &&
        (!c.variedadId || c.variedadId === variedadEncontrada.id)
    );
    if (!calibreEncontrado) return null;
    return { variedadId: variedadEncontrada.id, calibreId: calibreEncontrado.id };
  }

  function aplicarLinea(linea: FacturaExtraida["lineas"][number]) {
    const resuelto = resolverVariedadCalibre(linea);
    if (resuelto) {
      setValue("variedadId", resuelto.variedadId);
      setValue("calibreId", resuelto.calibreId);
    } else {
      const variedadEncontrada = variedades.find((v) => normalizar(v.nombre) === normalizar(linea.variedad));
      if (!variedadEncontrada) {
        toast.info(`No encontré la variedad "${linea.variedad}" — selecciónala a mano`);
      } else {
        setValue("variedadId", variedadEncontrada.id);
        toast.info(`No encontré el calibre "${linea.calibre}" — selecciónalo a mano`);
      }
    }
    setValue("kilos", linea.kilos);
    setValue("precioKg", linea.precioKg);
  }

  async function registrarTodasLasLineas() {
    if (!facturaExtraida) return;
    const proveedorActual = form.getValues("proveedorId");
    if (!proveedorActual) {
      toast.error("Selecciona el proveedor antes de registrar todas las líneas");
      return;
    }

    const base = form.getValues();
    const sinCalibre: string[] = [];
    const payloads = facturaExtraida.lineas
      .map((linea, i) => {
        const resuelto = resolverVariedadCalibre(linea);
        if (!resuelto) {
          sinCalibre.push(`${linea.variedad} ${linea.calibre} (${linea.kilos} kg)`);
          return null;
        }
        return {
          fecha: base.fecha,
          proveedorId: proveedorActual,
          variedadId: resuelto.variedadId,
          calibreId: resuelto.calibreId,
          kilos: linea.kilos,
          precioKg: linea.precioKg,
          formaPago: base.formaPago,
          estadoPago: base.estadoPago,
          nFactura: base.nFactura,
          // El neto/IVA es del total de la factura, no por línea — se deja
          // solo en la primera para no repetir el mismo monto N veces.
          neto: i === 0 ? base.neto : undefined,
          iva: i === 0 ? base.iva : undefined,
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);

    if (sinCalibre.length > 0) {
      toast.error(`No encontré variedad/calibre para: ${sinCalibre.join(", ")} — carga esas a mano`);
    }
    if (payloads.length === 0) return;

    setRegistrandoLote(true);
    try {
      const res = await fetch("/api/v1/compras/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ compras: payloads }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "No se pudieron registrar las compras");
        return;
      }
      const resultados = (data.resultados ?? []) as { ok: boolean; error?: string }[];
      const exitosas = resultados.filter((r) => r.ok).length;
      const fallidas = resultados.filter((r) => !r.ok);
      if (fallidas.length === 0) {
        toast.success(`${exitosas} compra(s) registrada(s)`);
        limpiarBorrador();
        router.push("/compras");
        router.refresh();
      } else {
        toast.error(
          `${exitosas} registrada(s), ${fallidas.length} con error: ${fallidas.map((f) => f.error).join(" · ")}`
        );
      }
    } catch {
      toast.error("No se pudieron registrar las compras — revisa tu conexión");
    } finally {
      setRegistrandoLote(false);
    }
  }

  const proveedorId = watch("proveedorId");
  const variedadId = watch("variedadId");
  const calibreId = watch("calibreId");
  const formaPago = watch("formaPago");
  const estadoPago = watch("estadoPago");
  const nFactura = watch("nFactura");
  const fecha = watch("fecha");
  const kilos = watch("kilos");

  useEffect(() => {
    const tieneFactura = Boolean(nFactura?.trim());
    const tieneSimilitud = Boolean(fecha && calibreId && kilos);
    if (!proveedorId || (!tieneFactura && !tieneSimilitud)) {
      setFacturasDuplicadas([]);
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      const params = new URLSearchParams({ proveedorId });
      if (tieneFactura) params.set("nFactura", nFactura!.trim());
      if (tieneSimilitud) {
        params.set("fecha", fecha!);
        params.set("calibreId", calibreId);
        params.set("kilos", String(kilos));
      }
      fetch(`/api/v1/compras/verificar-factura?${params.toString()}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data) => setFacturasDuplicadas(data.duplicadas ?? []))
        .catch(() => {});
    }, 500);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [proveedorId, nFactura, fecha, calibreId, kilos]);

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
            Cada línea es una compra distinta. Puedes cargarlas una por una, o registrarlas todas
            juntas (necesitas el proveedor seleccionado abajo primero).
          </p>
          <Button
            type="button"
            variant="default"
            size="sm"
            className="w-fit"
            disabled={registrandoLote}
            onClick={registrarTodasLasLineas}
          >
            {registrandoLote ? "Registrando..." : `Registrar las ${facturaExtraida.lineas.length} líneas`}
          </Button>
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

      {facturasDuplicadas.length > 0 && (
        <Alert variant="destructive">
          <AlertTitle>Posible compra duplicada</AlertTitle>
          <AlertDescription>
            {facturasDuplicadas.map((c) => (
              <div key={c.id}>
                {formatDateCL(c.fecha)} · {Number(c.kilos)} kg · {formatCLP(Number(c.total))} — {c.motivo}
              </div>
            ))}
            Revisa que no sea un duplicado antes de guardar.
          </AlertDescription>
        </Alert>
      )}

      <Button type="submit" disabled={isSubmitting} className="mt-2 w-fit">
        {isSubmitting ? "Guardando..." : "Registrar compra"}
      </Button>
    </form>
  );
}
