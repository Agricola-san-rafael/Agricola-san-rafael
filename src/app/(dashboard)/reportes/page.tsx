import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  obtenerConcentracion,
  obtenerDescalceDePlazos,
  obtenerKPIs,
  obtenerVencidas,
} from "@/modules/reportes/service";
import { formatCLP } from "@/modules/shared/money";
import { formatDateCL } from "@/modules/shared/dates";

export default async function ReportesPage() {
  const [kpis, concentracion, vencidas, descalce] = await Promise.all([
    obtenerKPIs(),
    obtenerConcentracion(),
    obtenerVencidas(),
    obtenerDescalceDePlazos(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Reportes</h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Ventas del mes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">{formatCLP(kpis.ventasDelMes.total)}</p>
            <p className="text-xs text-muted-foreground">
              {kpis.ventasDelMes.cantidad} ventas · margen {formatCLP(kpis.ventasDelMes.margen)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Compras del mes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">{formatCLP(kpis.comprasDelMes.total)}</p>
            <p className="text-xs text-muted-foreground">{kpis.comprasDelMes.cantidad} compras</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">CxC / CxP</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">{formatCLP(kpis.totalCxC)}</p>
            <p className="text-xs text-muted-foreground">por pagar: {formatCLP(kpis.totalCxP)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Capital de trabajo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">{formatCLP(kpis.capitalDeTrabajo)}</p>
            <p className="text-xs text-muted-foreground">
              stock valorizado: {formatCLP(kpis.stockValorizado)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Descalce de plazos</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <p className="text-xs text-muted-foreground">
            Positivo: damos más crédito del que recibimos (riesgo de caja). Negativo: cobramos
            antes de pagar.
          </p>
          <div className="flex gap-6">
          <p>
            Plazo promedio a clientes:{" "}
            <strong>{descalce.plazoPromedioClientes.toFixed(0)} días</strong>
          </p>
          <p>
            Plazo promedio de proveedores:{" "}
            <strong>{descalce.plazoPromedioProveedores.toFixed(0)} días</strong>
          </p>
          <p>
            Descalce:{" "}
            <strong className={descalce.descalceDias > 0 ? "text-destructive" : ""}>
              {descalce.descalceDias.toFixed(0)} días
            </strong>
          </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="mb-2 text-lg font-medium">Top clientes por volumen</h2>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Kilos</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {concentracion.topClientes.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.nombre}</TableCell>
                    <TableCell className="text-right">{c.totalKilos} kg</TableCell>
                    <TableCell className="text-right">{formatCLP(c.totalMonto)}</TableCell>
                  </TableRow>
                ))}
                {concentracion.topClientes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      Sin ventas todavía.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-medium">Top proveedores por volumen</h2>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proveedor</TableHead>
                  <TableHead className="text-right">Kilos</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {concentracion.topProveedores.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.nombre}</TableCell>
                    <TableCell className="text-right">{p.totalKilos} kg</TableCell>
                    <TableCell className="text-right">{formatCLP(p.totalMonto)}</TableCell>
                  </TableRow>
                ))}
                {concentracion.topProveedores.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      Sin compras todavía.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-lg font-medium">Cuentas vencidas</h2>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Entidad</TableHead>
                <TableHead>Venció</TableHead>
                <TableHead className="text-right">Días de atraso</TableHead>
                <TableHead className="text-right">Monto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vencidas.map((v) => (
                <TableRow key={`${v.tipo}-${v.id}`}>
                  <TableCell>
                    <Badge variant={v.tipo === "cxc" ? "default" : "destructive"}>
                      {v.tipo === "cxc" ? "Por cobrar" : "Por pagar"}
                    </Badge>
                  </TableCell>
                  <TableCell>{v.entidadNombre}</TableCell>
                  <TableCell>{formatDateCL(v.fechaVencimiento)}</TableCell>
                  <TableCell className="text-right">{v.diasAtraso}</TableCell>
                  <TableCell className="text-right">{formatCLP(v.monto)}</TableCell>
                </TableRow>
              ))}
              {vencidas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Sin cuentas vencidas.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
