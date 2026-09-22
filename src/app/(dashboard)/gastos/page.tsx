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
import { listarGastos } from "@/modules/gastos/service";
import { parsePageParams } from "@/modules/shared/pagination";
import { formatCLP } from "@/modules/shared/money";
import { formatDateCL } from "@/modules/shared/dates";
import type { EmpresaGasto } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";

const FILTROS: { value: EmpresaGasto | "todos"; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "agricola", label: "Agrícola San Rafael" },
  { value: "transporte", label: "Transportes San Rafael SpA" },
];

export default async function GastosPage({
  searchParams,
}: {
  searchParams: Promise<{ empresa?: string }>;
}) {
  const { empresa: empresaParam } = await searchParams;
  const empresa: EmpresaGasto | undefined =
    empresaParam === "agricola" || empresaParam === "transporte" ? empresaParam : undefined;

  const { data: gastos } = await listarGastos(
    parsePageParams(new URLSearchParams({ pageSize: "50" })),
    empresa
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Gastos operacionales</h1>
        <div className="flex flex-wrap gap-2">
          <LinkButton href="/gastos/desde-foto" variant="outline">
            Registrar desde foto
          </LinkButton>
          <LinkButton href="/gastos/nuevo">Nuevo gasto</LinkButton>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b pb-2">
        {FILTROS.map((f) => {
          const activo = (empresa ?? "todos") === f.value;
          return (
            <Link
              key={f.value}
              href={f.value === "todos" ? "/gastos" : `/gastos?empresa=${f.value}`}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm",
                activo ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted/50"
              )}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Empresa</TableHead>
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
                <TableCell>
                  <Badge variant={g.empresa === "transporte" ? "secondary" : "outline"}>
                    {g.empresa === "transporte" ? "Transporte" : "Agrícola"}
                  </Badge>
                </TableCell>
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
                <TableCell colSpan={6} className="text-center text-muted-foreground">
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
