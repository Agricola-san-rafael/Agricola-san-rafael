import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { obtenerCuentasChoferes } from "@/modules/fletes/choferes";
import { formatCLP } from "@/modules/shared/money";
import { formatDateCL } from "@/modules/shared/dates";
import { FormularioChofer } from "./formulario-chofer";

export default async function ChoferesPage() {
  const session = await getSession();
  if (session?.rol !== "admin") redirect("/dashboard");
  const { saldos, movimientos } = await obtenerCuentasChoferes();
  const totalDeuda = saldos.reduce((a, s) => a + Math.max(0, s.saldo), 0);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Choferes</h1>
        <p className="text-muted-foreground">
          Lo que se le debe a cada chofer: el pago de cada viaje y los reembolsos de gastos suman; lo que se le paga resta.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Total que se debe a choferes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">{formatCLP(totalDeuda)}</p>
          </CardContent>
        </Card>
        {saldos.map((s) => (
          <Card key={s.chofer}>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">{s.chofer}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-semibold">{formatCLP(s.saldo)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <FormularioChofer choferes={saldos.map((s) => s.chofer)} />

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Chofer</TableHead>
              <TableHead>Concepto</TableHead>
              <TableHead className="text-right">Monto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movimientos.map((m) => (
              <TableRow key={m.id}>
                <TableCell>{formatDateCL(m.fecha)}</TableCell>
                <TableCell>{m.chofer}</TableCell>
                <TableCell>{m.concepto}</TableCell>
                <TableCell className={`text-right ${Number(m.monto) < 0 ? "text-green-500" : ""}`}>{formatCLP(Number(m.monto))}</TableCell>
              </TableRow>
            ))}
            {movimientos.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">Sin movimientos todavía.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
