import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { obtenerCierreMensual, mesValido } from "@/modules/reportes/cierre-mensual";
import { formatCLP } from "@/modules/shared/money";

const NOMBRES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

function ultimosMeses(cantidad: number): string[] {
  const hoy = new Date();
  return Array.from({ length: cantidad }, (_, i) => {
    const d = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() - i, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}

const etiqueta = (mes: string) => `${NOMBRES[Number(mes.slice(5)) - 1]} ${mes.slice(0, 4)}`;

export default async function CierrePage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const session = await getSession();
  if (session?.rol !== "admin") redirect("/dashboard");

  const meses = ultimosMeses(6);
  const { mes: pedido } = await searchParams;
  const mes = mesValido(pedido) ? pedido : meses[1] ?? meses[0];
  const c = await obtenerCierreMensual(mes);

  const tarjetas: [string, string][] = [
    ["Vendido", formatCLP(c.ventas.total)],
    ["Utilidad bruta", formatCLP(c.ventas.utilidadBruta)],
    ["Gastos", formatCLP(c.gastos.total)],
    ["Fletes imputados", formatCLP(c.fletes.imputadoAgricola)],
    ["Utilidad neta agrícola", formatCLP(c.utilidadNeta)],
    ["Resultado del transporte", formatCLP(c.fletes.resultadoTransporte)],
    ["Utilidad neta consolidada", formatCLP(c.utilidadNetaConsolidada)],
    ["Comprado", formatCLP(c.compras.total)],
    ["Cobrado", formatCLP(c.cobrosDelMes)],
    ["Pagado a proveedores", formatCLP(c.pagosDelMes)],
    ["IVA compras registrado", formatCLP(c.compras.ivaRegistrado)],
  ];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Cierre mensual</h1>
        <p className="text-muted-foreground">
          Resumen del mes y un Excel con el detalle de ventas, compras, gastos, cobros y pagos para el contador.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {meses.map((m) => (
          <Link key={m} href={`/reportes/cierre?mes=${m}`} className={buttonVariants({ size: "sm", variant: m === mes ? "default" : "outline" })}>
            {etiqueta(m)}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {tarjetas.map(([t, v]) => (
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

      <p className="text-sm text-muted-foreground">
        {c.ventas.cantidad} ventas · {Math.round(c.ventas.kilos)} kg vendidos · {c.compras.cantidad} compras.
        {c.gastos.total === 0 && " Ojo: no hay gastos cargados este mes, así que la utilidad neta puede estar sobreestimada."}
      </p>

      <a href={`/api/v1/reportes/cierre-mensual?mes=${mes}`} className={buttonVariants({ className: "w-fit" })}>
        Descargar Excel de {etiqueta(mes)}
      </a>
    </div>
  );
}
