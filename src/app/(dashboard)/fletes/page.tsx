import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { resumirFletes } from "@/modules/fletes/service";
import { formatCLP } from "@/modules/shared/money";
import { formatDateCL } from "@/modules/shared/dates";
import { BorrarFlete } from "./borrar-flete";

const TIPO: Record<string, string> = { compra: "Compra", venta: "Venta", tercero: "Tercero" };

export default async function FletesPage() {
  const session = await getSession();
  const hoy = new Date();
  const inicioMes = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), 1));

  const [mes, total, fletes] = await Promise.all([
    resumirFletes(inicioMes),
    resumirFletes(),
    prisma.flete.findMany({
      orderBy: { fecha: "desc" },
      take: 50,
      include: {
        compra: { select: { proveedor: { select: { nombre: true } } } },
        venta: { select: { cliente: { select: { nombre: true } } } },
      },
    }),
  ]);

  const tarjetas: [string, string][] = [
    ["Viajes del mes", String(mes.viajes)],
    ["Costo real del mes", formatCLP(mes.costoReal)],
    ["Ingresos del mes", formatCLP(mes.ingresos)],
    ["Resultado del transporte (mes)", formatCLP(mes.resultadoTransporte)],
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Fletes</h1>
          <p className="text-muted-foreground">
            Viajes de Transportes San Rafael SpA, ligados a la compra o venta que transportaron.
          </p>
        </div>
        <LinkButton href="/fletes/nuevo">Nuevo viaje</LinkButton>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {tarjetas.map(([t, v]) => (
          <Card key={t}>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">{t}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-semibold">{v}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        Acumulado: {total.viajes} viajes, costo real {formatCLP(total.costoReal)}, imputado a la agrícola{" "}
        {formatCLP(total.imputadoAgricola)}, ingresos por fletes a terceros {formatCLP(total.ingresoTerceros)}.
        {total.sinLigar > 0 && ` Hay ${total.sinLigar} viaje(s) sin ligar a una compra o venta.`}
      </p>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Operación</TableHead>
              <TableHead>Recorrido</TableHead>
              <TableHead className="text-right">Costo real</TableHead>
              <TableHead className="text-right">Cobrado</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {fletes.map((f) => (
              <TableRow key={f.id}>
                <TableCell>{formatDateCL(f.fecha)}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{TIPO[f.tipo]}</Badge>
                </TableCell>
                <TableCell>
                  {f.tipo === "tercero"
                    ? f.terceroNombre
                    : f.compra?.proveedor.nombre ?? f.venta?.cliente.nombre ?? "sin ligar"}
                </TableCell>
                <TableCell>{[f.origen, f.destino].filter(Boolean).join(" → ") || "—"}</TableCell>
                <TableCell className="text-right">{formatCLP(Number(f.costoTotal))}</TableCell>
                <TableCell className="text-right">
                  {f.tarifaCobrada === null ? "—" : formatCLP(Number(f.tarifaCobrada))}
                </TableCell>
                <TableCell className="text-right">{session?.rol === "admin" && <BorrarFlete id={f.id} />}</TableCell>
              </TableRow>
            ))}
            {fletes.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Sin viajes registrados todavía.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
