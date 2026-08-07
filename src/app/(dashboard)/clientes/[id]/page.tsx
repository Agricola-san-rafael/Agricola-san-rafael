import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { obtenerCliente, obtenerMovimientosCliente } from "@/modules/clientes/service";
import { formatCLP } from "@/modules/shared/money";
import { formatDateCL } from "@/modules/shared/dates";
import { NotFoundError } from "@/modules/shared/errors";
import { ClienteForm } from "../cliente-form";
import { CobroForm } from "./cobro-form";

export default async function ClienteDetallePage({ params }: PageProps<"/clientes/[id]">) {
  const { id } = await params;

  try {
    const [cliente, movimientos] = await Promise.all([
      obtenerCliente(id),
      obtenerMovimientosCliente(id),
    ]);

    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{cliente.nombre}</h1>
            <p className="text-muted-foreground">Detalle del cliente</p>
          </div>
          <a
            href={`/api/v1/clientes/${cliente.id}/estado-cuenta`}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-primary hover:underline"
          >
            Descargar estado de cuenta (PDF)
          </a>
        </div>

        <Card className="max-w-sm">
          <CardHeader>
            <CardTitle>Saldo pendiente (cuentas por cobrar)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{formatCLP(cliente.saldoPendiente)}</p>
          </CardContent>
        </Card>

        <ClienteForm cliente={cliente} />

        <div>
          <h2 className="mb-2 text-lg font-medium">Registrar cobro</h2>
          <CobroForm clienteId={cliente.id} />
        </div>

        <div>
          <h2 className="mb-2 text-lg font-medium">Historial de movimientos</h2>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Detalle</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movimientos.map((m) => (
                  <TableRow key={`${m.tipo}-${m.id}`}>
                    <TableCell>{formatDateCL(m.fecha)}</TableCell>
                    <TableCell className="capitalize">{m.tipo}</TableCell>
                    <TableCell>{m.detalle}</TableCell>
                    <TableCell className="text-right">{formatCLP(m.monto)}</TableCell>
                  </TableRow>
                ))}
                {movimientos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Sin movimientos todavía.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
}
