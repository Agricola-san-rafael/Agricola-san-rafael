import { notFound } from "next/navigation";
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
import { obtenerVenta } from "@/modules/ventas/service";
import { formatCLP } from "@/modules/shared/money";
import { formatDateCL } from "@/modules/shared/dates";
import { NotFoundError } from "@/modules/shared/errors";

export default async function VentaDetallePage({ params }: PageProps<"/ventas/[id]">) {
  const { id } = await params;

  try {
    const venta = await obtenerVenta(id);

    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold">
            Venta a {venta.cliente.nombre}
            {venta.forzada && (
              <Badge variant="destructive" className="ml-2 align-middle">
                forzada sobre stock
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground">
            {formatDateCL(venta.fecha)} · {venta.variedad.nombre} / {venta.calibre.codigo}
          </p>
        </div>

        <div className="grid max-w-2xl grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Total</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{formatCLP(Number(venta.total))}</p>
              <p className="text-sm text-muted-foreground">
                {Number(venta.kilos)} kg × {formatCLP(Number(venta.precioKg))}/kg
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Margen</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{formatCLP(Number(venta.margen))}</p>
              <p className="text-sm text-muted-foreground">
                {(Number(venta.margenPct) * 100).toFixed(1)}%
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Estado de pago</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge>{venta.estadoPago}</Badge>
              <p className="mt-2 text-sm text-muted-foreground">
                {venta.formaPago === "credito" ? "Crédito" : "Contado"}
              </p>
            </CardContent>
          </Card>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-medium">Lotes consumidos (FIFO)</h2>
          <div className="max-w-2xl overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lote</TableHead>
                  <TableHead>Ingreso del lote</TableHead>
                  <TableHead className="text-right">Kilos consumidos</TableHead>
                  <TableHead className="text-right">Costo/kg</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {venta.ventaLotes.map((vl) => (
                  <TableRow key={vl.id}>
                    <TableCell className="font-mono text-xs">
                      {vl.loteId.slice(0, 8)}
                    </TableCell>
                    <TableCell>{formatDateCL(vl.lote.fechaIngreso)}</TableCell>
                    <TableCell className="text-right">
                      {Number(vl.kilosConsumidos)} kg
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCLP(Number(vl.costoKgLote))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {venta.observaciones && (
          <div>
            <h2 className="text-lg font-medium">Observaciones</h2>
            <p className="text-muted-foreground">{venta.observaciones}</p>
          </div>
        )}
      </div>
    );
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
}
