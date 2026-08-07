import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listarAlertas } from "@/modules/alertas/service";
import { formatDateCL } from "@/modules/shared/dates";
import { ResolverAlertaButton } from "./resolver-alerta-button";

const TIPO_LABEL: Record<string, string> = {
  cxc_vencimiento: "Cuenta por cobrar",
  cxp_vencimiento: "Cuenta por pagar",
  sobreventa_stock: "Sobreventa de stock",
  gasto_pendiente: "Gasto pendiente",
};

export default async function AlertasPage() {
  const alertas = await listarAlertas();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Alertas</h1>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Mensaje</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {alertas.map((a) => (
              <TableRow key={a.id}>
                <TableCell>{formatDateCL(a.fechaDisparo)}</TableCell>
                <TableCell>{TIPO_LABEL[a.tipo] ?? a.tipo}</TableCell>
                <TableCell>{a.mensaje}</TableCell>
                <TableCell>
                  <Badge variant={a.estado === "pendiente" ? "destructive" : "secondary"}>
                    {a.estado}
                  </Badge>
                </TableCell>
                <TableCell>
                  {a.estado === "pendiente" && <ResolverAlertaButton id={a.id} />}
                </TableCell>
              </TableRow>
            ))}
            {alertas.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Sin alertas todavía.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
