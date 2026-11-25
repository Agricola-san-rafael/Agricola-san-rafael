"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NumericInput } from "@/components/forms/numeric-input";
import { SelectField } from "@/components/forms/select-field";
import { todayLocalISODate } from "@/modules/shared/dates";
import { formatCLP } from "@/modules/shared/money";
import { diferenciaDeConteo } from "@/modules/mermas/calculo";
import { CAUSAS_MERMA, ETIQUETA_CAUSA, type CausaMermaValor } from "@/modules/mermas/causas";

export interface FilaStock {
  variedadId: string;
  calibreId: string;
  etiqueta: string;
  kilosSistema: number;
  costoPromedio: number;
  lotes: number;
}

const OPCIONES_CAUSA = CAUSAS_MERMA.map((c) => ({ value: c, label: ETIQUETA_CAUSA[c] }));
const kilos = (n: number) => n.toLocaleString("es-CL", { maximumFractionDigits: 2 });

/** Acepta "567", "567,5" y "567.5". Vacío o inválido devuelve null. */
function leerKilos(texto: string): number | null {
  const t = texto.trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function ConteoStockForm({ stock }: { stock: FilaStock[] }) {
  const router = useRouter();
  const [fecha, setFecha] = useState(todayLocalISODate());
  const [pesados, setPesados] = useState<Record<string, string>>({});
  const [causas, setCausas] = useState<Record<string, CausaMermaValor>>({});
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const clave = (f: FilaStock) => `${f.variedadId}|${f.calibreId}`;

  const filas = useMemo(
    () =>
      stock.map((f) => {
        const pesado = leerKilos(pesados[clave(f)] ?? "");
        const dif = pesado === null ? null : diferenciaDeConteo(f.kilosSistema, pesado);
        return { ...f, pesado, dif, valor: dif ? Math.round(dif.faltan * f.costoPromedio) : 0, causa: causas[clave(f)] ?? "perdida_peso" };
      }),
    [stock, pesados, causas],
  );
  const conMerma = filas.filter((f) => f.dif && f.dif.faltan > 0);
  const conSobrante = filas.filter((f) => f.dif && f.dif.sobran > 0);
  const totalKilos = conMerma.reduce((a, f) => a + (f.dif?.faltan ?? 0), 0);
  const totalValor = conMerma.reduce((a, f) => a + f.valor, 0);

  async function registrar() {
    setEnviando(true);
    try {
      const res = await fetch("/api/v1/mermas/conteo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fecha,
          conteos: conMerma.map((f) => ({
            variedadId: f.variedadId,
            calibreId: f.calibreId,
            kilosSistema: f.kilosSistema,
            kilosPesados: f.pesado,
            causa: f.causa,
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo registrar la merma");
        return;
      }
      toast.success(`Merma registrada: ${kilos(data.totalKilos)} kg (${formatCLP(data.totalValor)})`);
      setConfirmando(false);
      setPesados({});
      setCausas({});
      router.refresh();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:max-w-xs">
        <Label htmlFor="fecha-conteo">Fecha del conteo</Label>
        <Input id="fecha-conteo" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
      </div>

      <div className="overflow-hidden rounded-md border">
        <div className="hidden grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_9rem_minmax(0,1.6fr)_13rem] gap-3 border-b bg-muted/40 px-3 py-2 text-sm font-medium md:grid">
          <span>Calibre</span>
          <span className="text-right">En el sistema</span>
          <span>Pesado</span>
          <span>Diferencia</span>
          <span>Causa</span>
        </div>
        {filas.map((f) => (
          <div
            key={clave(f)}
            className="grid grid-cols-2 items-center gap-x-3 gap-y-2 border-b px-3 py-3 last:border-b-0 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_9rem_minmax(0,1.6fr)_13rem]"
          >
            <div className="col-span-2 md:col-span-1">
              <span className="font-medium">{f.etiqueta}</span>
              <span className="block text-xs text-muted-foreground">
                {f.lotes} {f.lotes === 1 ? "lote" : "lotes"}
              </span>
            </div>
            <div className="flex flex-col md:items-end">
              <span className="text-xs text-muted-foreground md:hidden">En el sistema</span>
              <span>{kilos(f.kilosSistema)} kg</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground md:hidden">Pesado</span>
              <NumericInput
                aria-label={`Kilos pesados de ${f.etiqueta}`}
                value={pesados[clave(f)] ?? ""}
                onChange={(e) => setPesados((p) => ({ ...p, [clave(f)]: e.target.value }))}
                placeholder="kg"
              />
            </div>
            <div className="col-span-2 text-sm md:col-span-1">
              {f.dif === null ? (
                <span className="text-muted-foreground">—</span>
              ) : f.dif.faltan > 0 ? (
                <span className="font-medium text-destructive">
                  Faltan {kilos(f.dif.faltan)} kg ({formatCLP(f.valor)})
                </span>
              ) : f.dif.sobran > 0 ? (
                <span className="font-medium text-amber-600 dark:text-amber-400">Sobran {kilos(f.dif.sobran)} kg: no se registra</span>
              ) : (
                <span className="text-muted-foreground">Cuadra</span>
              )}
            </div>
            <div className="col-span-2 md:col-span-1">
              {f.dif && f.dif.faltan > 0 ? (
                <SelectField
                  value={f.causa}
                  onValueChange={(v) => v && setCausas((c) => ({ ...c, [clave(f)]: v as CausaMermaValor }))}
                  options={OPCIONES_CAUSA}
                />
              ) : null}
            </div>
          </div>
        ))}
        {filas.length === 0 && <p className="px-3 py-4 text-center text-muted-foreground">Sin stock en el sistema.</p>}
      </div>

      {conSobrante.length > 0 && (
        <p className="text-sm text-amber-700 dark:text-amber-400">
          Donde sobran kilos no se registra nada: revisa el conteo, o corrige el lote con &quot;Ajustar&quot; en Lotes disponibles.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => setConfirmando(true)} disabled={conMerma.length === 0}>
          Registrar merma
        </Button>
        {conMerma.length > 0 && (
          <span className="text-sm text-muted-foreground">
            {kilos(totalKilos)} kg · {formatCLP(totalValor)} al costo
          </span>
        )}
      </div>

      <Dialog open={confirmando} onOpenChange={setConfirmando}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar merma</DialogTitle>
            <DialogDescription>
              Se descuentan estos kilos del stock y se anotan como pérdida de inventario. No se mueve plata de ninguna caja.
            </DialogDescription>
          </DialogHeader>
          <ul className="flex flex-col gap-2 text-sm">
            {conMerma.map((f) => (
              <li key={clave(f)} className="flex justify-between gap-4">
                <span>
                  {f.etiqueta} <span className="text-muted-foreground">({ETIQUETA_CAUSA[f.causa]})</span>
                </span>
                <span className="whitespace-nowrap">
                  {kilos(f.dif?.faltan ?? 0)} kg · {formatCLP(f.valor)}
                </span>
              </li>
            ))}
            <li className="flex justify-between gap-4 border-t pt-2 font-medium">
              <span>Total</span>
              <span className="whitespace-nowrap">
                {kilos(totalKilos)} kg · {formatCLP(totalValor)}
              </span>
            </li>
          </ul>
          <DialogFooter>
            <DialogClose render={<Button variant="ghost" />}>Cancelar</DialogClose>
            <Button onClick={registrar} disabled={enviando}>
              {enviando ? "Guardando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
