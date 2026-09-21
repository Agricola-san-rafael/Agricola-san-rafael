import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { obtenerPrestamoEntreEmpresas } from "@/modules/empresas/prestamos";
import { formatCLP } from "@/modules/shared/money";
import { formatDateCL } from "@/modules/shared/dates";
import { FormularioPrestamo } from "./formulario-prestamo";

export default async function PrestamoEntreEmpresasPage() {
  const session = await getSession();
  if (session?.rol !== "admin") redirect("/dashboard");
  const { saldo, movimientos } = await obtenerPrestamoEntreEmpresas();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Préstamo entre empresas</h1>
        <p className="text-muted-foreground">
          Plata que la Agrícola San Rafael le presta a Transportes San Rafael SpA (por ejemplo, lo que se
          pagó del camión desde la cuenta de la agrícola) y lo que el transporte devuelve.
        </p>
      </div>

      <Card className="max-w-sm">
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">El transporte le debe a la agrícola</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">{formatCLP(saldo)}</p>
        </CardContent>
      </Card>

      <FormularioPrestamo />

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Concepto</TableHead>
              <TableHead>Referencia</TableHead>
              <TableHead className="text-right">Monto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movimientos.map((m) => (
              <TableRow key={m.id}>
                <TableCell>{formatDateCL(m.fecha)}</TableCell>
                <TableCell>{m.concepto}</TableCell>
                <TableCell className="text-muted-foreground">{m.referencia ?? "—"}</TableCell>
                <TableCell className={`text-right ${Number(m.monto) < 0 ? "text-green-500" : ""}`}>
                  {formatCLP(Number(m.monto))}
                </TableCell>
              </TableRow>
            ))}
            {movimientos.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Sin movimientos todavía.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
