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
import { obtenerCliente, obtenerFletesCliente } from "@/modules/clientes/service";
import { formatCLP } from "@/modules/shared/money";
import { formatDateCL } from "@/modules/shared/dates";
import { NotFoundError } from "@/modules/shared/errors";
import { ClienteForm } from "../../../clientes/cliente-form";

export default async function ClienteTransporteDetallePage({ params }: PageProps<"/fletes/clientes/[id]">) {
  const { id } = await params;

  try {
    const [cliente, { fletes, totalFacturado, pendiente }] = await Promise.all([
      obtenerCliente(id),
      obtenerFletesCliente(id),
    ]);

    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold">{cliente.nombre}</h1>
          <p className="text-muted-foreground">Cliente de Transportes San Rafael SpA</p>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Total facturado (histórico)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{formatCLP(totalFacturado)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Pendiente de cobro</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{formatCLP(pendiente)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Viajes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{fletes.length}</p>
            </CardContent>
          </Card>
        </div>

        <ClienteForm cliente={cliente} empresa="transporte" volverA="/fletes/clientes" />

        <div>
          <h2 className="mb-2 text-lg font-medium">Historial de viajes</h2>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Ruta</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fletes.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell>{formatDateCL(f.fecha)}</TableCell>
                    <TableCell>{[f.origen, f.destino].filter(Boolean).join(" → ") || "—"}</TableCell>
                    <TableCell className="capitalize">{f.estadoCobro}</TableCell>
                    <TableCell className="text-right">
                      {formatCLP(Number(f.totalFacturado ?? f.tarifaCobrada ?? 0))}
                    </TableCell>
                  </TableRow>
                ))}
                {fletes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Sin viajes todavía.
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
