import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { obtenerFlujoCaja, obtenerResumenCaja } from "@/modules/flujo-caja/service";
import { formatCLP } from "@/modules/shared/money";
import { formatDateCL } from "@/modules/shared/dates";
import { getSession } from "@/lib/auth";
import { AjustarCajaDialog } from "./ajustar-caja-dialog";
import { ArqueoDialog } from "./arqueo-dialog";

const TIPO_VARIANT: Record<string, "default" | "destructive" | "secondary"> = {
  cobro: "default",
  pago: "destructive",
  gasto: "destructive",
  ajuste: "secondary",
};

const DIAS_ALERTA_ARQUEO = 7;

export default async function FlujoCajaPage({
  searchParams,
}: {
  searchParams: Promise<{ caja?: string }>;
}) {
  const { caja } = await searchParams;
  const filtro = caja === "efectivo" || caja === "banco" ? caja : null;

  const [movimientos, resumen, session] = await Promise.all([
    obtenerFlujoCaja(),
    obtenerResumenCaja(),
    getSession(),
  ]);
  const esAdmin = session?.rol === "admin";
  const filas = filtro ? movimientos.filter((m) => m.caja === filtro) : movimientos;
  const { saldos, ultimoArqueo } = resumen;

  const tarjetas = [
    { titulo: "Efectivo", valor: saldos.efectivo },
    { titulo: "Banco", valor: saldos.banco },
    { titulo: "Total", valor: saldos.total },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Flujo de caja</h1>
        {esAdmin && (
          <div className="flex items-center gap-2">
            <ArqueoDialog efectivoSistema={saldos.efectivo} bancoSistema={saldos.banco} />
            <AjustarCajaDialog />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {tarjetas.map((t) => (
          <Card key={t.titulo}>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">{t.titulo}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-semibold">{formatCLP(t.valor)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {(!ultimoArqueo || ultimoArqueo.dias > DIAS_ALERTA_ARQUEO) && (
        <Alert>
          <AlertDescription>
            {ultimoArqueo
              ? `Hace ${ultimoArqueo.dias} días que no cuentas la plata (último arqueo: ${formatDateCL(ultimoArqueo.fecha)}). `
              : "Todavía no se ha hecho ningún arqueo. "}
            Cuenta el efectivo y el saldo del banco y usa &quot;Hacer arqueo&quot; para que la caja
            quede igual a la realidad.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap gap-2">
        <LinkButton href="/flujo-caja" size="sm" variant={filtro ? "outline" : "default"}>
          Todas
        </LinkButton>
        <LinkButton href="/flujo-caja?caja=efectivo" size="sm" variant={filtro === "efectivo" ? "default" : "outline"}>
          Efectivo
        </LinkButton>
        <LinkButton href="/flujo-caja?caja=banco" size="sm" variant={filtro === "banco" ? "default" : "outline"}>
          Banco
        </LinkButton>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Caja</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead className="text-right">Saldo corrido</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.map((m) => (
              <TableRow key={`${m.tipo}-${m.id}`}>
                <TableCell>{formatDateCL(m.fecha)}</TableCell>
                <TableCell>
                  <Badge variant={TIPO_VARIANT[m.tipo]}>{m.tipo}</Badge>
                </TableCell>
                <TableCell className="capitalize">{m.caja}</TableCell>
                <TableCell>{m.descripcion}</TableCell>
                <TableCell className="text-right">{formatCLP(m.monto)}</TableCell>
                <TableCell className="text-right font-medium">
                  {formatCLP(filtro ? m.saldoCaja : m.saldoCorrido)}
                </TableCell>
              </TableRow>
            ))}
            {filas.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Sin movimientos de caja todavía.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
