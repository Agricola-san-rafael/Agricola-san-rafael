import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { obtenerKPIs } from "@/modules/reportes/service";
import { formatCLP } from "@/modules/shared/money";

export default async function DashboardPage() {
  const kpis = await obtenerKPIs();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground">Resumen del negocio y accesos rápidos.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <LinkButton href="/compras/nueva">+ Compra</LinkButton>
        <LinkButton href="/ventas/nueva">+ Venta</LinkButton>
        <LinkButton href="/gastos/nuevo">+ Gasto</LinkButton>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Ventas del mes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">{formatCLP(kpis.ventasDelMes.total)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Por cobrar</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">{formatCLP(kpis.totalCxC)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Por pagar</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">{formatCLP(kpis.totalCxP)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Stock valorizado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">{formatCLP(kpis.stockValorizado)}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
