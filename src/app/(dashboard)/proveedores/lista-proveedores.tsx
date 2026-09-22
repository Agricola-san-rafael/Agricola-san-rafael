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
import { parsePageParams } from "@/modules/shared/pagination";
import { listarProveedores } from "@/modules/proveedores/service";
import type { EmpresaGasto } from "@/generated/prisma/client";

/** Lista de proveedores de una empresa (agrícola o transporte); cada una tiene la suya propia. */
export async function ListaProveedores({ empresa, basePath }: { empresa: EmpresaGasto; basePath: string }) {
  const { data: proveedores } = await listarProveedores(
    parsePageParams(new URLSearchParams({ pageSize: "50" })),
    empresa
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Proveedores</h1>
        <LinkButton href={`${basePath}/nuevo`}>Nuevo proveedor</LinkButton>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Condiciones</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {proveedores.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <Link href={`${basePath}/${p.id}`} className="font-medium hover:underline">
                    {p.nombre}
                  </Link>
                </TableCell>
                <TableCell>{p.telefono ?? p.contacto ?? "—"}</TableCell>
                <TableCell>
                  {p.condicionesPago === "credito"
                    ? `Crédito (${p.plazoPagoDias ?? 0} días)`
                    : "Contado"}
                </TableCell>
                <TableCell>
                  <Badge variant={p.activo ? "default" : "secondary"}>
                    {p.activo ? "Activo" : "Inactivo"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {proveedores.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Sin proveedores registrados todavía.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
