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
import { obtenerPorCobrar } from "@/modules/cobros/por-cobrar";
import { formatCLP } from "@/modules/shared/money";

export default async function PorCobrarPage() {
  const resumen = await obtenerPorCobrar();
  const monto = (n: number) => (n > 0 ? formatCLP(n) : "—");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Por cobrar</h1>
        <p className="text-muted-foreground">
          Quién te debe y hace cuántos días. Los días se cuentan desde la fecha de la venta.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Total por cobrar</CardTitle>
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

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead className="text-right">Debe</TableHead>
              <TableHead className="text-right">0-30 días</TableHead>
              <TableHead className="text-right">31-60 días</TableHead>
              <TableHead className="text-right">Más de 60</TableHead>
              <TableHead className="text-right">Deuda más antigua</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {resumen.clientes.map((c) => (
              <TableRow key={c.clienteId}>
                <TableCell>
                  <Link href={`/clientes/${c.clienteId}`} className="font-medium hover:underline">
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
            {resumen.clientes.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No hay deudas pendientes.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
