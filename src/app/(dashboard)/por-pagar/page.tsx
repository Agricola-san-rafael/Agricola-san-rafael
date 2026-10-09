import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { obtenerFacturasPorPagar, obtenerPorPagar } from "@/modules/pagos/por-pagar";
import { formatCLP } from "@/modules/shared/money";
import { formatDateCL } from "@/modules/shared/dates";

function estadoVencimiento(dias: number | null): { texto: string; clase: string } {
  if (dias === null) return { texto: "Sin plazo definido", clase: "text-muted-foreground" };
  if (dias < 0) return { texto: `Vencida hace ${-dias} ${dias === -1 ? "día" : "días"}`, clase: "font-medium text-destructive" };
  if (dias === 0) return { texto: "Vence hoy", clase: "font-medium text-destructive" };
  if (dias === 1) return { texto: "Vence mañana", clase: "font-medium" };
  return { texto: `Vence en ${dias} días`, clase: "" };
}

export default async function PorPagarPage() {
  const [resumen, facturas] = await Promise.all([obtenerPorPagar(), obtenerFacturasPorPagar()]);
  const monto = (n: number) => (n > 0 ? formatCLP(n) : "—");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Por pagar</h1>
          <p className="text-muted-foreground">
            A quién le debes y hace cuántos días. Los días se cuentan desde la fecha de la compra.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Total por pagar</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">{formatCLP(resumen.total)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">0 a 30 días</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">{formatCLP(resumen.hasta30)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">31 a 60 días</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">{formatCLP(resumen.de31a60)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Más de 60 días</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold text-destructive">{formatCLP(resumen.mas60)}</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-2 text-lg font-medium">Facturas por pagar</h2>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proveedor</TableHead>
                <TableHead>Factura</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead className="text-right">Falta pagar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {facturas.map((f) => {
                const estado = estadoVencimiento(f.diasParaVencer);
                return (
                  <TableRow key={`${f.proveedorId}-${f.compraId}`}>
                    <TableCell>
                      <Link href={`/proveedores/${f.proveedorId}`} className="font-medium hover:underline">
                        {f.proveedor}
                      </Link>
                    </TableCell>
                    <TableCell>{f.nFactura ? `N° ${f.nFactura}` : "Sin número"}</TableCell>
                    <TableCell>{formatDateCL(f.fecha)}</TableCell>
                    <TableCell>
                      {f.vencimiento && <span>{formatDateCL(f.vencimiento)} · </span>}
                      <span className={estado.clase}>{estado.texto}</span>
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCLP(f.pendiente)}</TableCell>
                  </TableRow>
                );
              })}
              {facturas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No hay facturas pendientes.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          El vencimiento es la fecha de la compra más el plazo de pago del proveedor. Te avisamos antes de que
          venza, el día que vence y cada 3 días mientras siga sin pagarse. Si un proveedor dice &quot;Sin plazo
          definido&quot;, pon su plazo en su ficha para recibir avisos.
        </p>
      </div>

      <h2 className="text-lg font-medium">Por proveedor</h2>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Proveedor</TableHead>
              <TableHead className="text-right">Le debes</TableHead>
              <TableHead className="text-right">0-30 días</TableHead>
              <TableHead className="text-right">31-60 días</TableHead>
              <TableHead className="text-right">Más de 60</TableHead>
              <TableHead className="text-right">Deuda más antigua</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {resumen.proveedores.map((c) => (
              <TableRow key={c.proveedorId}>
                <TableCell>
                  <Link href={`/proveedores/${c.proveedorId}`} className="font-medium hover:underline">
                    {c.nombre}
                  </Link>
                  {c.telefono && (
                    <p className="text-xs text-muted-foreground">{c.telefono}</p>
                  )}
                </TableCell>
                <TableCell className="text-right font-medium">{formatCLP(c.saldo)}</TableCell>
                <TableCell className="text-right">{monto(c.hasta30)}</TableCell>
                <TableCell className="text-right">{monto(c.de31a60)}</TableCell>
                <TableCell className="text-right text-destructive">{monto(c.mas60)}</TableCell>
                <TableCell className="text-right">{c.diasDeudaMasAntigua} días</TableCell>
              </TableRow>
            ))}
            {resumen.proveedores.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No debes nada a proveedores.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
