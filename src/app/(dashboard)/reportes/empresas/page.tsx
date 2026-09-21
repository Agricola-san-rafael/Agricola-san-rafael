import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { obtenerUtilidadPorEmpresa } from "@/modules/reportes/empresas";
import type { Periodo } from "@/modules/reportes/utilidad";
import { formatCLP } from "@/modules/shared/money";

const PERIODOS: { valor: Periodo; etiqueta: string }[] = [
  { valor: "mes", etiqueta: "Este mes" },
  { valor: "anterior", etiqueta: "Mes anterior" },
  { valor: "todo", etiqueta: "Todo" },
];

type Fila = [string, number, ("total" | "resta" | "normal")?];

function Bloque({ titulo, filas, resultado, etiquetaResultado }: { titulo: string; filas: Fila[]; resultado: number; etiquetaResultado: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 text-sm">
        {filas.map(([nombre, monto, tipo]) => (
          <div key={nombre} className={`flex justify-between gap-4 ${tipo === "total" ? "border-t pt-1 font-medium" : ""}`}>
            <span className="text-muted-foreground">{tipo === "resta" ? `− ${nombre}` : nombre}</span>
            <span>{formatCLP(monto)}</span>
          </div>
        ))}
        <div className="mt-2 flex justify-between gap-4 border-t pt-2 text-base font-semibold">
          <span>{etiquetaResultado}</span>
          <span className={resultado < 0 ? "text-destructive" : ""}>{formatCLP(resultado)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function EmpresasPage({ searchParams }: { searchParams: Promise<{ periodo?: string }> }) {
  const session = await getSession();
  if (session?.rol !== "admin") redirect("/dashboard");

  const { periodo: p } = await searchParams;
  const periodo: Periodo = p === "anterior" || p === "todo" ? p : "mes";
  const u = await obtenerUtilidadPorEmpresa(periodo);
  const { agricola: a, transporte: t } = u;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Utilidad por empresa</h1>
        <p className="text-muted-foreground">
          Agrícola San Rafael y Transportes San Rafael SpA por separado. Un viaje sin tarifa se cobra a la agrícola a su costo real,
          así ningún costo se cuenta dos veces al sumar las dos empresas.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {PERIODOS.map((x) => (
          <Link key={x.valor} href={`/reportes/empresas?periodo=${x.valor}`} className={buttonVariants({ size: "sm", variant: x.valor === periodo ? "default" : "outline" })}>
            {x.etiqueta}
          </Link>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Bloque
          titulo="Agrícola San Rafael"
          etiquetaResultado="Utilidad neta"
          resultado={a.utilidadNeta}
          filas={[
            ["Ventas", a.ventas],
            ["Costo de la fruta vendida", a.costoLotes, "resta"],
            ["Utilidad bruta", a.utilidadBruta, "total"],
            ["Gastos operacionales", a.gastos, "resta"],
            ["Fletes pagados al transporte", a.fletesImputados, "resta"],
          ]}
        />
        <Bloque
          titulo={`Transportes San Rafael SpA (${t.viajes} viajes)`}
          etiquetaResultado="Utilidad del transporte"
          resultado={t.utilidad}
          filas={[
            ["Ingresos por fletes de la agrícola", t.ingresosDeLaAgricola],
            ["Ingresos por fletes a terceros", t.ingresosDeTerceros],
            ["Ingresos totales", t.ingresos, "total"],
            ["Combustible", t.costoCombustible, "resta"],
            ["Chofer", t.costoChofer, "resta"],
            ["Peajes", t.costoPeajes, "resta"],
            ["Otros costos", t.costoOtros, "resta"],
          ]}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Utilidad de las dos empresas juntas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className={`text-2xl font-semibold ${u.consolidado.utilidad < 0 ? "text-destructive" : ""}`}>
            {formatCLP(u.consolidado.utilidad)}
          </p>
        </CardContent>
      </Card>

      {t.viajes === 0 && (
        <p className="text-sm text-muted-foreground">
          Todavía no hay viajes registrados en este período, por eso el transporte aparece en cero. Regístralos
          en Fletes para ver su utilidad.
        </p>
      )}
    </div>
  );
}
