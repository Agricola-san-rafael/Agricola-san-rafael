"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface GastoRutaBorrador {
  uid: string;
  descripcion: string;
  monto: string;
}

let contador = 0;
const nuevaFila = (): GastoRutaBorrador => ({ uid: `g${++contador}`, descripcion: "", monto: "" });

/** Filas de descripción + monto para los gastos en ruta de un viaje que se está registrando. */
export function GastosRutaEditor({
  gastos,
  onChange,
}: {
  gastos: GastoRutaBorrador[];
  onChange: (gastos: GastoRutaBorrador[]) => void;
}) {
  const actualizar = (uid: string, cambio: Partial<GastoRutaBorrador>) =>
    onChange(gastos.map((g) => (g.uid === uid ? { ...g, ...cambio } : g)));

  return (
    <div className="flex flex-col gap-2">
      {gastos.map((g) => (
        <div key={g.uid} className="grid grid-cols-[minmax(0,1fr)_7rem_auto] items-center gap-2">
          <Input
            aria-label="Descripción del gasto"
            placeholder="Ej: almuerzo chofer"
            value={g.descripcion}
            onChange={(e) => actualizar(g.uid, { descripcion: e.target.value })}
          />
          <Input
            aria-label="Monto del gasto"
            inputMode="decimal"
            placeholder="$"
            value={g.monto}
            onChange={(e) => actualizar(g.uid, { monto: e.target.value })}
          />
          <Button type="button" size="sm" variant="ghost" onClick={() => onChange(gastos.filter((x) => x.uid !== g.uid))}>
            Quitar
          </Button>
        </div>
      ))}
      <Button type="button" size="sm" variant="outline" className="w-fit" onClick={() => onChange([...gastos, nuevaFila()])}>
        Agregar gasto en ruta
      </Button>
    </div>
  );
}
