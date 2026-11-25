"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SelectField } from "@/components/forms/select-field";
import { todayLocalISODate } from "@/modules/shared/dates";
import { formatCLP } from "@/modules/shared/money";
import { calcularPeajesPorKm, calcularSugeridoPorKm } from "@/modules/fletes/consumo";
import { Checkbox } from "@/components/ui/checkbox";
import { GastosRutaEditor, type GastoRutaBorrador } from "../gastos-ruta-editor";

const OTRO_CLIENTE = "__otro__";

interface Opcion {
  value: string;
  label: string;
}

const TIPOS = [
  { value: "compra", label: "Transporta una compra (fruta que llega)" },
  { value: "venta", label: "Entrega una venta" },
  { value: "tercero", label: "Flete para un tercero" },
];

const num = (s: string) => Number(s.replace(/\./g, "").replace(",", ".")) || 0;

export function FleteForm({
  compras,
  ventas,
  clientesTransporte,
  tipoInicial = "venta",
  volverA = "/fletes",
  parametros = { combustiblePorKm: 0, tarifaPorKm: 0, kmPorPeaje: 0, costoPorPeaje: 0 },
}: {
  compras: Opcion[];
  ventas: Opcion[];
  clientesTransporte: Opcion[];
  tipoInicial?: "compra" | "venta" | "tercero";
  volverA?: string;
  parametros?: { combustiblePorKm: number; tarifaPorKm: number; kmPorPeaje: number; costoPorPeaje: number };
}) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [tipo, setTipo] = useState<"compra" | "venta" | "tercero">(tipoInicial);
  const [fecha, setFecha] = useState(todayLocalISODate());
  const [operacionId, setOperacionId] = useState<string | undefined>();
  const [clienteId, setClienteId] = useState<string | undefined>();
  const [tercero, setTercero] = useState("");
  const [origen, setOrigen] = useState("");
  const [destino, setDestino] = useState("");
  const [kilos, setKilos] = useState("");
  const [vehiculo, setVehiculo] = useState("");
  const [km, setKm] = useState("");
  const [soloIda, setSoloIda] = useState(false);
  const [nombreChofer, setNombreChofer] = useState("");
  const [estadoCobro, setEstadoCobro] = useState<"pendiente" | "cobrado">("pendiente");
  const [nFactura, setNFactura] = useState("");
  const [totalFacturado, setTotalFacturado] = useState("");
  const [combustible, setCombustible] = useState("");
  const [chofer, setChofer] = useState("");
  const [peajes, setPeajes] = useState("");
  const [otros, setOtros] = useState("");
  const [gastosRuta, setGastosRuta] = useState<GastoRutaBorrador[]>([]);
  const [tarifa, setTarifa] = useState("");
  const [observaciones, setObservaciones] = useState("");

  const gastosRutaValidos = gastosRuta
    .map((g) => ({ descripcion: g.descripcion.trim(), monto: num(g.monto) }))
    .filter((g) => g.descripcion && g.monto > 0);
  const totalGastosRuta = gastosRutaValidos.reduce((a, g) => a + g.monto, 0);
  const gastosRutaIncompletos = gastosRuta.some(
    (g) => (g.descripcion.trim() || g.monto.trim()) && !(g.descripcion.trim() && num(g.monto) > 0),
  );
  const costoTotal = num(combustible) + num(chofer) + num(peajes) + num(otros) + totalGastosRuta;
  const kmNum = num(km);
  // Si solo se escribió la ida, el viaje real es el doble (ida y vuelta); todo se calcula con ese total.
  const kmTotal = soloIda ? kmNum * 2 : kmNum;
  const combustibleSugerido = calcularSugeridoPorKm(kmTotal || undefined, parametros.combustiblePorKm);
  const tarifaSugerida = calcularSugeridoPorKm(kmTotal || undefined, parametros.tarifaPorKm);
  const peajesSugeridos = calcularPeajesPorKm(kmTotal || undefined, parametros.kmPorPeaje, parametros.costoPorPeaje);

  async function guardar() {
    if (gastosRutaIncompletos) {
      toast.error("Completa la descripción y el monto de cada gasto en ruta, o quita la fila");
      return;
    }
    setEnviando(true);
    try {
      const res = await fetch("/api/v1/fletes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fecha, tipo,
          compraId: tipo === "compra" ? operacionId : undefined,
          ventaId: tipo === "venta" ? operacionId : undefined,
          clienteId: tipo === "tercero" && clienteId && clienteId !== OTRO_CLIENTE ? clienteId : undefined,
          terceroNombre: tercero, origen, destino, kilos, vehiculo, km: soloIda && kmNum > 0 ? String(kmTotal) : km,
          chofer: nombreChofer, estadoCobro, nFactura,
          totalFacturado: totalFacturado ? num(totalFacturado) : undefined,
          costoCombustible: num(combustible), costoChofer: num(chofer), costoPeajes: num(peajes), costoOtros: num(otros),
          gastosRuta: gastosRutaValidos,
          tarifaCobrada: tarifa ? num(tarifa) : undefined, observaciones,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "No se pudo registrar el viaje");
        return;
      }
      toast.success(tipo === "tercero" ? "Servicio de transporte registrado" : "Viaje registrado");
      router.push(volverA);
      router.refresh();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <Label>Fecha</Label>
          <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Tipo de viaje</Label>
          <SelectField
            value={tipo}
            onValueChange={(v) => { setTipo((v ?? "venta") as typeof tipo); setOperacionId(undefined); }}
            options={TIPOS}
          />
        </div>

        {tipo === "compra" && (
          <div className="flex flex-col gap-1 sm:col-span-2">
            <Label>Compra transportada</Label>
            <SelectField value={operacionId} onValueChange={setOperacionId} options={compras} placeholder="Elige la compra" />
          </div>
        )}
        {tipo === "venta" && (
          <div className="flex flex-col gap-1 sm:col-span-2">
            <Label>Venta entregada</Label>
            <SelectField value={operacionId} onValueChange={setOperacionId} options={ventas} placeholder="Elige la venta" />
          </div>
        )}
        {tipo === "tercero" && (
          <div className="flex flex-col gap-1 sm:col-span-2">
            <Label>Flete para</Label>
            <SelectField
              value={clienteId}
              onValueChange={(v) => {
                setClienteId(v);
                const opcion = clientesTransporte.find((c) => c.value === v);
                setTercero(opcion ? opcion.label : "");
              }}
              options={[...clientesTransporte, { value: OTRO_CLIENTE, label: "Otro (escribir nombre)" }]}
              placeholder="Elige el cliente"
            />
            {(clienteId === OTRO_CLIENTE || (!clienteId && clientesTransporte.length === 0)) && (
              <Input
                className="mt-1"
                value={tercero}
                onChange={(e) => setTercero(e.target.value)}
                placeholder="Nombre de la empresa o persona"
              />
            )}
            <Link href="/fletes/clientes/nuevo" className="text-xs text-primary hover:underline">
              + Crear cliente nuevo del transporte
            </Link>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <Label>Origen</Label>
          <Input value={origen} onChange={(e) => setOrigen(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Destino</Label>
          <Input value={destino} onChange={(e) => setDestino(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Kilos transportados</Label>
          <Input inputMode="decimal" value={kilos} onChange={(e) => setKilos(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Kilómetros recorridos</Label>
          <Input inputMode="decimal" value={km} onChange={(e) => setKm(e.target.value)} />
          <div className="flex items-center gap-2">
            <Checkbox id="solo-ida" checked={soloIda} onCheckedChange={(v) => setSoloIda(v === true)} />
            <Label htmlFor="solo-ida" className="text-xs font-normal">
              Escribí solo la ida (calcular ida y vuelta)
            </Label>
          </div>
          {soloIda && kmNum > 0 && (
            <p className="text-xs text-muted-foreground">Ida y vuelta: {kmTotal} km</p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <Label>Nombre del chofer</Label>
          <Input value={nombreChofer} onChange={(e) => setNombreChofer(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Camión o patente</Label>
          <Input value={vehiculo} onChange={(e) => setVehiculo(e.target.value)} />
        </div>
      </div>

      <div className="rounded-md border p-3">
        <p className="mb-2 text-sm font-medium">Costo real del viaje</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <Label>Combustible</Label>
            <Input inputMode="decimal" value={combustible} onChange={(e) => setCombustible(e.target.value)} />
            {combustibleSugerido > 0 && (
              <button
                type="button"
                onClick={() => setCombustible(String(combustibleSugerido))}
                className="w-fit text-left text-xs text-primary hover:underline"
              >
                Sugerido por km: {formatCLP(combustibleSugerido)} (usar)
              </button>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <Label>Chofer</Label>
            <Input inputMode="decimal" value={chofer} onChange={(e) => setChofer(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <Label>Peajes</Label>
            <Input inputMode="decimal" value={peajes} onChange={(e) => setPeajes(e.target.value)} />
            {peajesSugeridos.costo > 0 && (
              <button
                type="button"
                onClick={() => setPeajes(String(peajesSugeridos.costo))}
                className="w-fit text-left text-xs text-primary hover:underline"
              >
                Sugerido por km ({kmTotal} km ida y vuelta): {peajesSugeridos.cantidad}{" "}
                {peajesSugeridos.cantidad === 1 ? "peaje" : "peajes"} × {formatCLP(parametros.costoPorPeaje)} ={" "}
                {formatCLP(peajesSugeridos.costo)} (usar)
              </button>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <Label>Otros</Label>
            <Input inputMode="decimal" value={otros} onChange={(e) => setOtros(e.target.value)} />
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-2 border-t pt-3">
          <Label>Gastos adicionales en ruta</Label>
          <p className="text-xs text-muted-foreground">
            Lo que se gastó en el camino: almuerzo, estacionamiento, una reparación, etc. Se suma al costo del viaje.
          </p>
          <GastosRutaEditor gastos={gastosRuta} onChange={setGastosRuta} />
          {totalGastosRuta > 0 && (
            <p className="text-sm text-muted-foreground">Total gastos en ruta: {formatCLP(totalGastosRuta)}</p>
          )}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">Costo total del viaje: {formatCLP(costoTotal)}</p>
      </div>

      <div className="flex flex-col gap-1">
        <Label>{tipo === "tercero" ? "Tarifa cobrada al tercero" : "Tarifa que cobra el transporte a la agrícola (opcional)"}</Label>
        <Input inputMode="decimal" value={tarifa} onChange={(e) => setTarifa(e.target.value)} />
        {tarifaSugerida > 0 && (
          <button
            type="button"
            onClick={() => setTarifa(String(tarifaSugerida))}
            className="w-fit text-left text-xs text-primary hover:underline"
          >
            Sugerido por km: {formatCLP(tarifaSugerida)} (usar)
          </button>
        )}
        {tipo !== "tercero" && (
          <p className="text-xs text-muted-foreground">
            Si la dejas vacía, a la operación se le suma el costo real del viaje. Si la ingresas, se le suma la tarifa.
          </p>
        )}
      </div>

      {tipo === "tercero" && (
        <div className="grid gap-3 rounded-md border p-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1">
            <Label>Estado del cobro</Label>
            <SelectField
              value={estadoCobro}
              onValueChange={(v) => setEstadoCobro((v ?? "pendiente") as typeof estadoCobro)}
              options={[
                { value: "pendiente", label: "Pendiente de cobro" },
                { value: "cobrado", label: "Ya cobrado" },
              ]}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label>N° de factura (opcional)</Label>
            <Input value={nFactura} onChange={(e) => setNFactura(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <Label>Total facturado con IVA (opcional)</Label>
            <Input inputMode="decimal" value={totalFacturado} onChange={(e) => setTotalFacturado(e.target.value)} />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <Label>Observaciones</Label>
        <Textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
      </div>

      <Button className="w-fit" onClick={guardar} disabled={enviando}>
        {enviando ? "Guardando..." : tipo === "tercero" ? "Registrar servicio" : "Registrar viaje"}
      </Button>
    </div>
  );
}
