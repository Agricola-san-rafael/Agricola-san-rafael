import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LinkButton } from "@/components/ui/link-button";
import { porCliente, porRuta, type FilaRentabilidad, type ViajeRentabilidad } from "@/modules/fletes/rentabilidad";
import { formatCLP } from "@/modules/shared/money";

function Tabla({ titulo, filas }: { titulo: string; filas: FilaRentabilidad[] }) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-lg font-medium">{titulo}</h2>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead className="text-right">Viajes</TableHead>
              <TableHead className="text-right">Km</TableHead>
              <TableHead className="text-right">Ingresos</TableHead>
              <TableHead className="text-right">Costo</TableHead>
              <TableHead className="text-right">Utilidad</TableHead>
              <TableHead className="text-right">Por km</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.map((f) => (
              <TableRow key={f.nombre}>
                <TableCell className="font-medium">{f.nombre}</TableCell>
                <TableCell className="text-right">{f.viajes}</TableCell>
                <TableCell className="text-right">{Math.round(f.km) || "—"}</TableCell>
                <TableCell className="text-right">{formatCLP(f.ingresos)}</TableCell>
                <TableCell className="text-right">{formatCLP(f.costo)}</TableCell>
                <TableCell className={`text-right font-medium ${f.utilidad < 0 ? "text-destructive" : ""}`}>{formatCLP(f.utilidad)}</TableCell>
                <TableCell className="text-right">{f.utilidadPorKm === null ? "—" : formatCLP(f.utilidadPorKm)}</TableCell>
              </TableRow>
            ))}
            {filas.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">Sin viajes todavía.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default async function RentabilidadTransportePage() {
  const session = await getSession();
  if (session?.rol !== "admin") redirect("/dashboard");

  const fletes = await prisma.flete.findMany({ where: { tipo: "tercero" } });
  const viajes: ViajeRentabilidad[] = fletes.map((f) => ({
    origen: f.origen,
    destino: f.destino,
    cliente: f.terceroNombre,
    km: f.km === null ? null : Number(f.km),
    ingresos: Number(f.tarifaCobrada ?? 0),
    costo: Number(f.costoTotal),
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Rentabilidad del transporte</h1>
          <p className="text-muted-foreground">
            Qué rutas y qué clientes dejan más ganancia, sobre los viajes cobrados a terceros. La utilidad es la tarifa
            neta menos el costo directo del viaje, antes de costos fijos.
          </p>
        </div>
        <LinkButton href="/reportes/equilibrio" variant="outline">Punto de equilibrio</LinkButton>
      </div>
      <Tabla titulo="Por ruta" filas={porRuta(viajes)} />
      <Tabla titulo="Por cliente" filas={porCliente(viajes)} />
    </div>
  );
}
