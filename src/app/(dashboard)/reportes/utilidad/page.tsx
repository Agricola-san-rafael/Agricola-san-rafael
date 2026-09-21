import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { obtenerUtilidad, type FilaUtilidad, type Periodo } from "@/modules/reportes/utilidad";
import { formatCLP } from "@/modules/shared/money";

const PERIODOS: { valor: Periodo; etiqueta: string }[] = [
  { valor: "mes", etiqueta: "Este mes" },
  { valor: "anterior", etiqueta: "Mes anterior" },
  { valor: "todo", etiqueta: "Todo" },
];

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

function TablaUtilidad({ titulo, filas }: { titulo: string; filas: FilaUtilidad[] }) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-lg font-medium">{titulo}</h2>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead className="text-right">Kilos</TableHead>
              <TableHead className="text-right">Ventas</TableHead>
              <TableHead className="text-right">Costo</TableHead>
              <TableHead className="text-right">Flete</TableHead>
              <TableHead className="text-right">Utilidad</TableHead>
              <TableHead className="text-right">%</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.map((f) => (
              <TableRow key={f.clave}>
                <TableCell className="font-medium">{f.nombre}</TableCell>
                <TableCell className="text-right">{Math.round(f.kilos)}</TableCell>
                <TableCell className="text-right">{formatCLP(f.ventas)}</TableCell>
                <TableCell className="text-right">{formatCLP(f.costo)}</TableCell>
                <TableCell className="text-right">{f.flete > 0 ? formatCLP(f.flete) : "—"}</TableCell>
                <TableCell className={`text-right font-medium ${f.margen < 0 ? "text-destructive" : ""}`}>
                  {formatCLP(f.margen)}
                </TableCell>
                <TableCell className={`text-right ${f.margen < 0 ? "text-destructive" : ""}`}>{pct(f.margenPct)}</TableCell>
              </TableRow>
            ))}
            {filas.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Sin ventas en este período.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default async function UtilidadPage({ searchParams }: { searchParams: Promise<{ periodo?: string }> }) {
  const session = await getSession();
  if (session?.rol !== "admin") redirect("/dashboard");

  const { periodo: p } = await searchParams;
  const periodo: Periodo = p === "anterior" || p === "todo" ? p : "mes";
  const resumen = await obtenerUtilidad(periodo);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Utilidad por cliente y calibre</h1>
        <p className="text-muted-foreground">
          Venta menos el costo del lote (con IVA en los proveedores que facturan con IVA) y menos el
          flete de cada operación. No incluye los ajustes de saldo ni los gastos operacionales.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {PERIODOS.map((x) => (
          <Link
            key={x.valor}
            href={`/reportes/utilidad?periodo=${x.valor}`}
            className={buttonVariants({ size: "sm", variant: x.valor === periodo ? "default" : "outline" })}
          >
            {x.etiqueta}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {[
          ["Ventas", formatCLP(resumen.total.ventas)],
          ["Costo", formatCLP(resumen.total.costo)],
          ["Flete", formatCLP(resumen.total.flete)],
          ["Utilidad", formatCLP(resumen.total.margen)],
          ["Margen", pct(resumen.total.margenPct)],
        ].map(([t, v]) => (
          <Card key={t}>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">{t}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-semibold">{v}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <TablaUtilidad titulo="Por calibre" filas={resumen.porCalibre} />
      <TablaUtilidad titulo="Por cliente" filas={resumen.porCliente} />
    </div>
  );
}
