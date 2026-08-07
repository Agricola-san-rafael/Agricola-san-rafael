import { LinkButton } from "@/components/ui/link-button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listarGastos } from "@/modules/gastos/service";
import { parsePageParams } from "@/modules/shared/pagination";
import { formatCLP } from "@/modules/shared/money";
import { formatDateCL } from "@/modules/shared/dates";

export default async function GastosPage() {
  const { data: gastos } = await listarGastos(
    parsePageParams(new URLSearchParams({ pageSize: "50" }))
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Gastos operacionales</h1>
        <LinkButton href="/gastos/nuevo">Nuevo gasto</LinkButton>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {gastos.map((g) => (
              <TableRow key={g.id}>
                <TableCell>{formatDateCL(g.fecha)}</TableCell>
                <TableCell className="capitalize">{g.categoria.replace("_", " ")}</TableCell>
                <TableCell>{g.descripcion ?? g.pagadoA ?? "—"}</TableCell>
                <TableCell className="text-right">{formatCLP(Number(g.monto))}</TableCell>
                <TableCell>
                  <Badge variant={g.estadoPago === "pagado" ? "default" : "destructive"}>
                    {g.estadoPago}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {gastos.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Sin gastos registrados todavía.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
