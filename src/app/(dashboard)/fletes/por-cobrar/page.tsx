import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { obtenerPorCobrarTransporte } from "@/modules/fletes/cobros-transporte";
import { formatCLP } from "@/modules/shared/money";
import { formatDateCL } from "@/modules/shared/dates";
import { BotonesCobro } from "@/app/(dashboard)/por-cobrar/botones-cobro";
import { MarcarCobrado } from "../marcar-cobrado";

export default async function PorCobrarTransportePage() {
  const { total, clientes } = await obtenerPorCobrarTransporte();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Por cobrar del transporte</h1>
        <p className="text-muted-foreground">
          Fletes cobrados a clientes o terceros que todavía no se pagan. El monto es lo facturado (con IVA) o, si no
          hay factura, la tarifa.
        </p>
      </div>

      <Card className="max-w-sm">
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Te deben por fletes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">{formatCLP(total)}</p>
        </CardContent>
      </Card>

      {clientes.map((c) => (
        <div key={c.cliente} className="flex flex-col gap-2 rounded-md border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-medium">{c.cliente}</p>
              <p className="text-sm text-muted-foreground">
                Debe {formatCLP(c.total)} · deuda más antigua hace {c.diasMasAntiguo} días
              </p>
            </div>
            <BotonesCobro mensaje={c.mensaje} urlWhatsApp={null} />
          </div>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Ruta</TableHead>
                  <TableHead>Factura</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {c.viajes.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>{formatDateCL(v.fecha)}</TableCell>
                    <TableCell>{v.ruta}</TableCell>
                    <TableCell>{v.nFactura ?? "—"}</TableCell>
                    <TableCell className="text-right">{formatCLP(v.monto)}</TableCell>
                    <TableCell className="text-right">
                      <MarcarCobrado id={v.id} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ))}
      {clientes.length === 0 && <p className="text-muted-foreground">No hay fletes pendientes de cobro.</p>}
    </div>
  );
}
