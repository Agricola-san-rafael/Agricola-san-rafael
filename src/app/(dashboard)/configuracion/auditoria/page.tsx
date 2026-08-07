import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { listarAuditLog } from "@/modules/shared/audit";

function formatCampos(campos: unknown): string {
  if (!campos || typeof campos !== "object") return "—";
  return Object.entries(campos as Record<string, unknown>)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");
}

export default async function AuditoriaPage() {
  const session = await getSession();
  if (session?.rol !== "admin") redirect("/dashboard");

  const registros = await listarAuditLog();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Auditoría</h1>
        <p className="text-muted-foreground">
          Quién cambió cada registro sensible (montos, saldos) y cuándo — solo admin.
        </p>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Tabla</TableHead>
              <TableHead>Acción</TableHead>
              <TableHead>Antes</TableHead>
              <TableHead>Después</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {registros.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.createdAt.toLocaleString("es-CL")}</TableCell>
                <TableCell>{r.usuario?.nombre ?? "—"}</TableCell>
                <TableCell>{r.tabla}</TableCell>
                <TableCell>
                  <Badge variant={r.accion === "create" ? "default" : "secondary"}>
                    {r.accion}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs">{formatCampos(r.campoAntes)}</TableCell>
                <TableCell className="text-xs">{formatCampos(r.campoDespues)}</TableCell>
              </TableRow>
            ))}
            {registros.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Sin registros de auditoría todavía.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
