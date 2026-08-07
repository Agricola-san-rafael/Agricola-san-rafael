import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { obtenerFlujoCaja } from "@/modules/flujo-caja/service";
import { formatCLP } from "@/modules/shared/money";
import { formatDateCL } from "@/modules/shared/dates";

const TIPO_VARIANT: Record<string, "default" | "destructive"> = {
  cobro: "default",
  pago: "destructive",
  gasto: "destructive",
};

export default async function FlujoCajaPage() {
  const movimientos = await obtenerFlujoCaja();
  const saldoFinal = movimientos.at(-1)?.saldoCorrido ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Flujo de caja</h1>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Saldo actual</p>
          <p className="text-xl font-semibold">{formatCLP(saldoFinal)}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead className="text-right">Saldo corrido</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movimientos.map((m) => (
              <TableRow key={`${m.tipo}-${m.id}`}>
                <TableCell>{formatDateCL(m.fecha)}</TableCell>
                <TableCell>
                  <Badge variant={TIPO_VARIANT[m.tipo]}>{m.tipo}</Badge>
                </TableCell>
                <TableCell>{m.descripcion}</TableCell>
                <TableCell className="text-right">{formatCLP(m.monto)}</TableCell>
                <TableCell className="text-right font-medium">
                  {formatCLP(m.saldoCorrido)}
                </TableCell>
              </TableRow>
            ))}
            {movimientos.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Sin movimientos de caja todavía.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
