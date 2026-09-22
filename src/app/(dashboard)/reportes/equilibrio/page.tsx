import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { obtenerEquilibrioAgricola } from "@/modules/reportes/equilibrio";
import { calcularPuntoEquilibrio } from "@/modules/fletes/rentabilidad";
import { totalCostosFijosMensuales } from "@/modules/fletes/costos-fijos";
import { formatCLP } from "@/modules/shared/money";

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const NOMBRES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const etiquetaMes = (m: string) => `${NOMBRES[Number(m.slice(5)) - 1]} ${m.slice(0, 4)}`;

function Barra({ valor }: { valor: number }) {
  return (
    <div className="h-2 w-full rounded bg-muted">
      <div className="h-2 rounded bg-primary" style={{ width: `${Math.round(Math.min(1, valor) * 100)}%` }} />
    </div>
  );
}

export default async function EquilibrioPage() {
  const session = await getSession();
  if (session?.rol !== "admin") redirect("/dashboard");

  const hoy = new Date();
  const inicioMes = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), 1));
  const [a, fijosTransporte, viajes] = await Promise.all([
    obtenerEquilibrioAgricola(),
    totalCostosFijosMensuales("transporte"),
    prisma.flete.findMany({ where: { tipo: "tercero", tarifaCobrada: { not: null } } }),
  ]);

  const ingresos = viajes.reduce((s, f) => s + Number(f.tarifaCobrada), 0);
  const costo = viajes.reduce((s, f) => s + Number(f.costoTotal), 0);
  const viajesMes = viajes.filter((f) => f.fecha >= inicioMes).length;
  const t = calcularPuntoEquilibrio({ costosFijosMensuales: fijosTransporte, viajes: viajes.length, ingresos, costoDirecto: costo });
  const progresoT = t.viajesEquilibrio ? Math.min(1, viajesMes / t.viajesEquilibrio) : 0;
  const ventasMes = a.mesActual.ventas;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Punto de equilibrio</h1>
        <p className="text-muted-foreground">
          Cuánto tiene que vender o cuántos viajes tiene que hacer cada empresa al mes para cubrir sus costos fijos.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Agrícola San Rafael</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            ["Margen bruto (meses completos)", pct(a.margenBrutoPct)],
            ["Utilidad por kilo", formatCLP(a.margenPorKg)],
            [`Costos fijos al mes (${a.origenCostosFijos})`, formatCLP(a.costosFijosUsados)],
            ["Ventas de equilibrio al mes", a.ventasEquilibrio === null ? "—" : formatCLP(a.ventasEquilibrio)],
          ].map(([t2, v]) => (
            <Card key={t2}>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">{t2}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-semibold">{v}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {a.ventasEquilibrio !== null && (
          <div className="flex flex-col gap-1 text-sm">
            <p>
              Este mes llevas {formatCLP(ventasMes)} vendidos, {pct(ventasMes / a.ventasEquilibrio)} de lo que necesitas
              ({a.kilosEquilibrio ? `unos ${Math.round(a.kilosEquilibrio).toLocaleString("es-CL")} kg al mes` : ""}).
            </p>
            <Barra valor={ventasMes / a.ventasEquilibrio} />
          </div>
        )}

        <div className="overflow-x-auto rounded-md border text-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="p-2">Mes</th>
                <th className="p-2 text-right">Ventas</th>
                <th className="p-2 text-right">Margen</th>
                <th className="p-2 text-right">$/kg</th>
                <th className="p-2 text-right">Gastos operacionales</th>
                <th className="p-2 text-right">Incobrables</th>
              </tr>
            </thead>
            <tbody>
              {a.meses.map((m) => (
                <tr key={m.mes} className="border-b last:border-0">
                  <td className="p-2">{etiquetaMes(m.mes)}</td>
                  <td className="p-2 text-right">{formatCLP(m.ventas)}</td>
                  <td className="p-2 text-right">{m.ventas > 0 ? pct(m.utilidadBruta / m.ventas) : "—"}</td>
                  <td className="p-2 text-right">{m.kilos > 0 ? formatCLP(m.utilidadBruta / m.kilos) : "—"}</td>
                  <td className="p-2 text-right">{formatCLP(m.gastosOperacionales)}</td>
                  <td className="p-2 text-right">{m.incobrables > 0 ? formatCLP(m.incobrables) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-md border p-3 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">Ojo:</strong>{" "}
            {a.origenCostosFijos === "promedio real"
              ? "no hay costos fijos configurados, así que uso el promedio de los gastos operacionales cargados. Como faltan costos reales (arriendo, sueldos, servicios), el equilibrio real es más alto. "
              : ""}
            Las deudas incobrables (condonaciones) suman {formatCLP(a.incobrablesTotal)}, el {pct(a.incobrablesSobreUtilidad)} de toda la utilidad bruta, y no se cuentan como costo fijo.
          </p>
          <p className="mt-2">Con otros costos fijos, las ventas de equilibrio serían:</p>
          <ul className="ml-5 list-disc">
            {[1000000, 2000000, 3000000].map((f) => (
              <li key={f}>
                {formatCLP(f)} al mes: {a.margenBrutoPct > 0 ? formatCLP(f / a.margenBrutoPct) : "—"} de venta.
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-medium">Transportes San Rafael SpA</h2>
          <LinkButton href="/fletes/costos-fijos" variant="outline">Costos fijos del transporte</LinkButton>
        </div>
        {fijosTransporte === 0 || t.viajesEquilibrio === null ? (
          <p className="text-sm text-muted-foreground">
            {fijosTransporte === 0
              ? "Todavía no hay costos fijos del transporte configurados. Cárgalos en Costos fijos (cuota del camión, seguros, contador, sueldo del chofer) para calcular el equilibrio."
              : "Aún no hay viajes con margen positivo para calcular el equilibrio."}
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {[
                ["Costos fijos al mes", formatCLP(fijosTransporte)],
                ["Utilidad por viaje (promedio)", formatCLP(t.margenPorViaje ?? 0)],
                ["Viajes de equilibrio al mes", String(t.viajesEquilibrio)],
                ["Viajes este mes", `${viajesMes}${t.faltan !== null ? ` (faltan ${Math.max(0, t.viajesEquilibrio - viajesMes)})` : ""}`],
              ].map(([t2, v]) => (
                <Card key={t2}>
                  <CardHeader>
                    <CardTitle className="text-sm text-muted-foreground">{t2}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xl font-semibold">{v}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Barra valor={progresoT} />
          </>
        )}
      </section>
    </div>
  );
}
