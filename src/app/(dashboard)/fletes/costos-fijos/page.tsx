import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCLP } from "@/modules/shared/money";
import { formatDateCL } from "@/modules/shared/dates";
import { FormularioCostoFijo, InterruptorCostoFijo } from "./formulario-costo-fijo";

export default async function CostosFijosPage() {
  const session = await getSession();
  if (session?.rol !== "admin") redirect("/dashboard");
  const costos = await prisma.costoFijoRecurrente.findMany({ orderBy: [{ empresa: "asc" }, { diaDelMes: "asc" }] });
  const total = (empresa: string) => costos.filter((c) => c.activo && c.empresa === empresa).reduce((a, c) => a + Number(c.monto), 0);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Costos fijos mensuales</h1>
        <p className="text-muted-foreground">
          Costos que se repiten cada mes. El día que corresponde, la app crea sola el gasto (y si se paga desde la cuenta de
          la agrícola, lo suma al préstamo entre empresas). También sirven para el punto de equilibrio.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Total al mes: transporte {formatCLP(total("transporte"))} · agrícola {formatCLP(total("agricola"))}
        </p>
      </div>

      <FormularioCostoFijo />

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead>Costo</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead>Día</TableHead>
              <TableHead>Desde</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {costos.map((c) => (
              <TableRow key={c.id} className={c.activo ? "" : "opacity-50"}>
                <TableCell>
                  <Badge variant="secondary">{c.empresa === "transporte" ? "transporte" : "agrícola"}</Badge>
                </TableCell>
                <TableCell>
                  {c.concepto}
                  {c.pagadoPorAgricola && <span className="ml-2 text-xs text-muted-foreground">(paga la agrícola)</span>}
                </TableCell>
                <TableCell className="text-right">{formatCLP(Number(c.monto))}</TableCell>
                <TableCell>{c.diaDelMes}</TableCell>
                <TableCell>{formatDateCL(c.desde)}</TableCell>
                <TableCell className="text-right">
                  <InterruptorCostoFijo id={c.id} activo={c.activo} />
                </TableCell>
              </TableRow>
            ))}
            {costos.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">Sin costos fijos configurados.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
