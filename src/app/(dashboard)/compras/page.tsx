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
import { listarCompras } from "@/modules/compras/service";
import { parsePageParams } from "@/modules/shared/pagination";
import { formatCLP } from "@/modules/shared/money";
import { formatDateCL } from "@/modules/shared/dates";

const ESTADO_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  pagado: "default",
  pendiente: "destructive",
  parcial: "secondary",
};

export default async function ComprasPage() {
  const { data: compras } = await listarCompras(
    parsePageParams(new URLSearchParams({ pageSize: "50" })),
    {}
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Compras</h1>
        <LinkButton href="/compras/nueva">Nueva compra</LinkButton>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Variedad / Calibre</TableHead>
              <TableHead>Kilos</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {compras.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{formatDateCL(c.fecha)}</TableCell>
                <TableCell>
                  <Link href={`/compras/${c.id}`} className="font-medium hover:underline">
                    {c.proveedor.nombre}
                  </Link>
                </TableCell>
                <TableCell>
                  {c.variedad.nombre} / {c.calibre.codigo}
                </TableCell>
                <TableCell>{Number(c.kilos)} kg</TableCell>
                <TableCell>{formatCLP(Number(c.total))}</TableCell>
                <TableCell>
                  <Badge variant={ESTADO_VARIANT[c.estadoPago]}>{c.estadoPago}</Badge>
                </TableCell>
              </TableRow>
            ))}
            {compras.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Sin compras registradas todavía.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
