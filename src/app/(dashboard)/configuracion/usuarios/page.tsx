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
import { listarUsuarios } from "@/modules/usuarios/service";
import { CrearUsuarioDialog } from "./crear-usuario-dialog";
import { EditarUsuarioDialog } from "./editar-usuario-dialog";
import { ResetearPasswordDialog } from "./resetear-password-dialog";

const ROL_LABEL: Record<string, string> = {
  admin: "Admin",
  operador: "Operador",
  solo_lectura: "Solo lectura",
};

export default async function UsuariosPage() {
  const session = await getSession();
  if (session?.rol !== "admin") redirect("/dashboard");

  const usuarios = await listarUsuarios();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Usuarios</h1>
          <p className="text-muted-foreground">
            Crea cuentas, cambia roles y resetea contraseñas — solo admin.
          </p>
        </div>
        <CrearUsuarioDialog />
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usuarios.map((u) => (
              <TableRow key={u.id}>
                <TableCell>{u.nombre}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>{u.telefono ?? "—"}</TableCell>
                <TableCell>{ROL_LABEL[u.rol] ?? u.rol}</TableCell>
                <TableCell>
                  <Badge variant={u.activo ? "default" : "secondary"}>
                    {u.activo ? "Activo" : "Inactivo"}
                  </Badge>
                </TableCell>
                <TableCell className="flex justify-end gap-2">
                  <EditarUsuarioDialog
                    usuarioId={u.id}
                    nombreActual={u.nombre}
                    telefonoActual={u.telefono}
                    rolActual={u.rol}
                    activoActual={u.activo}
                  />
                  <ResetearPasswordDialog usuarioId={u.id} nombre={u.nombre} />
                </TableCell>
              </TableRow>
            ))}
            {usuarios.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Sin usuarios registrados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
