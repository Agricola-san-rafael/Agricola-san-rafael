import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getSession } from "@/lib/auth";
import { formatDateCL } from "@/modules/shared/dates";
import { formatCLP } from "@/modules/shared/money";
import { CAUSAS_MERMA, ETIQUETA_CAUSA } from "@/modules/mermas/causas";
import {
  listarUltimasMermas,
  obtenerMermasPorLote,
  obtenerResumenMermas,
  obtenerStockParaConteo,
} from "@/modules/mermas/service";
import { ConteoStockForm } from "./conteo-stock-form";

const kilos = (n: number) => n.toLocaleString("es-CL", { maximumFractionDigits: 2 });
const pct = (n: number) => `${n.toLocaleString("es-CL", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

function nombreMes(mes: string): string {
  const [anio, m] = mes.split("-").map(Number);
  const nombre = new Date(Date.UTC(anio, m - 1, 1)).toLocaleDateString("es-CL", { month: "long", year: "numeric", timeZone: "UTC" });
  return nombre.charAt(0).toUpperCase() + nombre.slice(1);
}

export default async function MermaPage() {
  const session = await getSession();
  const [stock, meses, porLote, ultimas] = await Promise.all([
    obtenerStockParaConteo(),
    obtenerResumenMermas(3),
    obtenerMermasPorLote(),
    listarUltimasMermas(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">Merma y conteo de stock</h1>
          <Link href="/inventario" className="text-sm text-primary hover:underline">
            Volver a Inventario
          </Link>
        </div>
        <p className="text-muted-foreground">
          Pesa lo que hay en bodega y anota los kilos. Lo que falte se descuenta de los lotes y queda guardado con su causa, para
          saber cuánto se pierde y por qué.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Contar el stock</h2>
        {session?.rol === "admin" ? (
          <ConteoStockForm stock={stock} />
        ) : (
          <p className="text-sm text-muted-foreground">Solo un administrador puede registrar un conteo.</p>
        )}
        <p className="max-w-3xl text-sm text-muted-foreground">
          Para que el número sirva, pesa siempre con la misma balanza, el mismo día y a la misma hora, y con el mismo peso de cajón.
          Si ya sabes que parte de la diferencia es fruta mala o una venta sin registrar, registra primero eso por separado.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Merma por mes</h2>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mes</TableHead>
                <TableHead className="text-right">Comprado</TableHead>
                <TableHead className="text-right">Merma</TableHead>
                <TableHead className="text-right">% de lo comprado</TableHead>
                <TableHead className="text-right">Valor al costo</TableHead>
                {CAUSAS_MERMA.map((c) => (
                  <TableHead key={c} className="text-right">
                    {ETIQUETA_CAUSA[c]}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {meses.map((m) => (
                <TableRow key={m.mes}>
                  <TableCell>{nombreMes(m.mes)}</TableCell>
                  <TableCell className="text-right">{kilos(m.kilosComprados)} kg</TableCell>
                  <TableCell className="text-right">{kilos(m.kilosMerma)} kg</TableCell>
                  <TableCell className="text-right">{m.kilosMerma > 0 && m.kilosComprados > 0 ? pct(m.porcentaje) : "—"}</TableCell>
                  <TableCell className="text-right">{formatCLP(m.valorMerma)}</TableCell>
                  {CAUSAS_MERMA.map((c) => (
                    <TableCell key={c} className="text-right">
                      {m.kilosPorCausa[c] > 0 ? `${kilos(m.kilosPorCausa[c])} kg` : "—"}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="text-sm text-muted-foreground">
          Solo cuenta lo registrado con esta pantalla; las pérdidas de inventario anteriores están en Gastos.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Lotes con más merma</h2>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lote</TableHead>
                <TableHead>Calibre</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead className="text-right">Días en bodega</TableHead>
                <TableHead className="text-right">Entró</TableHead>
                <TableHead className="text-right">Merma</TableHead>
                <TableHead className="text-right">% del lote</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {porLote.map((l) => (
                <TableRow key={l.loteId}>
                  <TableCell className="font-mono">{l.sku}</TableCell>
                  <TableCell>{l.calibre}</TableCell>
                  <TableCell>{l.proveedor}</TableCell>
                  <TableCell className="text-right">{l.diasEnBodega}</TableCell>
                  <TableCell className="text-right">{kilos(l.kilosIniciales)} kg</TableCell>
                  <TableCell className="text-right">{kilos(l.kilosMerma)} kg</TableCell>
                  <TableCell className="text-right">{pct(l.porcentaje)}</TableCell>
                </TableRow>
              ))}
              {porLote.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Todavía no hay merma registrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Últimos registros</h2>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Lote</TableHead>
                <TableHead>Calibre</TableHead>
                <TableHead className="text-right">Kilos</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Causa</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ultimas.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{formatDateCL(m.fecha)}</TableCell>
                  <TableCell className="font-mono">{m.sku}</TableCell>
                  <TableCell>{m.calibre}</TableCell>
                  <TableCell className="text-right">{kilos(m.kilos)} kg</TableCell>
                  <TableCell className="text-right">{formatCLP(m.valor)}</TableCell>
                  <TableCell>{ETIQUETA_CAUSA[m.causa]}</TableCell>
                </TableRow>
              ))}
              {ultimas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Sin registros.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
