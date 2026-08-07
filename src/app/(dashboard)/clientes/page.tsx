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
import { listarClientes } from "@/modules/clientes/service";

export default async function ClientesPage() {
  const { data: clientes } = await listarClientes(
    parsePageParams(new URLSearchParams({ pageSize: "50" }))
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Clientes</h1>
        <LinkButton href="/clientes/nuevo">Nuevo cliente</LinkButton>
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
            {clientes.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <Link href={`/clientes/${c.id}`} className="font-medium hover:underline">
                    {c.nombre}
                  </Link>
                </TableCell>
                <TableCell>{c.telefono ?? c.contacto ?? "—"}</TableCell>
                <TableCell>
                  {c.condicionesPago === "credito"
                    ? `Crédito (${c.plazoPagoDias ?? 0} días)`
                    : "Contado"}
                </TableCell>
                <TableCell>
                  <Badge variant={c.activo ? "default" : "secondary"}>
                    {c.activo ? "Activo" : "Inactivo"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {clientes.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Sin clientes registrados todavía.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
