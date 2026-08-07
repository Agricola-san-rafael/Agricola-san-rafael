import Link from "next/link";
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
import { listarVentas } from "@/modules/ventas/service";
import { parsePageParams } from "@/modules/shared/pagination";
import { formatCLP } from "@/modules/shared/money";
import { formatDateCL } from "@/modules/shared/dates";

const ESTADO_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  pagado: "default",
  pendiente: "destructive",
  parcial: "secondary",
};

export default async function VentasPage() {
  const { data: ventas } = await listarVentas(
    parsePageParams(new URLSearchParams({ pageSize: "50" })),
    {}
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Ventas</h1>
        <LinkButton href="/ventas/nueva">Nueva venta</LinkButton>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Variedad / Calibre</TableHead>
              <TableHead>Kilos</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Margen</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ventas.map((v) => (
              <TableRow key={v.id}>
                <TableCell>{formatDateCL(v.fecha)}</TableCell>
                <TableCell>
                  <Link href={`/ventas/${v.id}`} className="font-medium hover:underline">
                    {v.cliente.nombre}
                  </Link>
                  {v.forzada && (
                    <Badge variant="destructive" className="ml-2">
                      forzada
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {v.variedad.nombre} / {v.calibre.codigo}
                </TableCell>
                <TableCell>{Number(v.kilos)} kg</TableCell>
                <TableCell>{formatCLP(Number(v.total))}</TableCell>
                <TableCell>{formatCLP(Number(v.margen))}</TableCell>
                <TableCell>
                  <Badge variant={ESTADO_VARIANT[v.estadoPago]}>{v.estadoPago}</Badge>
                </TableCell>
              </TableRow>
            ))}
            {ventas.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Sin ventas registradas todavía.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
