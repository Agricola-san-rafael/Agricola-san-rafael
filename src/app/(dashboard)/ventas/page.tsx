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
import { listarVentas } from "@/modules/ventas/service";
import { listarServiciosTransporte } from "@/modules/fletes/service";
import { parsePageParams } from "@/modules/shared/pagination";
import { formatCLP } from "@/modules/shared/money";
import { formatDateCL } from "@/modules/shared/dates";
import { MarcarCobrado } from "../fletes/marcar-cobrado";
import { cn } from "@/lib/utils";

const ESTADO_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  pagado: "default",
  pendiente: "destructive",
  parcial: "secondary",
};

const FILTROS = [
  { value: "todos", label: "Todos" },
  { value: "agricola", label: "Agrícola San Rafael" },
  { value: "transporte", label: "Transportes San Rafael SpA" },
] as const;

async function TablaVentasAgricola() {
  const { data: ventas } = await listarVentas(
    parsePageParams(new URLSearchParams({ pageSize: "50" })),
    {}
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Ventas de fruta (Agrícola San Rafael)</h2>
        <LinkButton href="/ventas/nueva">Nueva venta</LinkButton>
      </div>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Variedad / Calibre</TableHead>
              <TableHead>Kilos</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Margen</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ventas.map((v) => (
              <TableRow key={v.id}>
                <TableCell>{formatDateCL(v.fecha)}</TableCell>
                <TableCell>
                  <Link href={`/ventas/${v.id}`} className="font-medium hover:underline">
                    {v.cliente.nombre}
                  </Link>
                  {v.forzada && (
                    <Badge variant="destructive" className="ml-2">
                      forzada
                    </Badge>
                  )}
                  {v.esAjuste && (
                    <Badge variant="secondary" className="ml-2">
                      ajuste de saldo
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {v.variedad.nombre} / {v.calibre.codigo}
                </TableCell>
                <TableCell>{Number(v.kilos)} kg</TableCell>
                <TableCell>{formatCLP(Number(v.total))}</TableCell>
                <TableCell>{formatCLP(Number(v.margen))}</TableCell>
                <TableCell>
                  <Badge variant={ESTADO_VARIANT[v.estadoPago]}>{v.estadoPago}</Badge>
                </TableCell>
              </TableRow>
            ))}
            {ventas.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Sin ventas registradas todavía.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

async function TablaServiciosTransporte() {
  const fletes = await listarServiciosTransporte();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Servicios de transporte (Transportes San Rafael SpA)</h2>
        <LinkButton href="/fletes/nuevo?tipo=tercero&volver=ventas">Nuevo servicio</LinkButton>
      </div>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Ruta</TableHead>
              <TableHead>Cobrado</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {fletes.map((f) => (
              <TableRow key={f.id}>
                <TableCell>{formatDateCL(f.fecha)}</TableCell>
                <TableCell>
                  <Link href={`/fletes`} className="font-medium hover:underline">
                    {f.cliente?.nombre ?? f.terceroNombre ?? "—"}
                  </Link>
                </TableCell>
                <TableCell>{[f.origen, f.destino].filter(Boolean).join(" → ") || "—"}</TableCell>
                <TableCell>{formatCLP(Number(f.totalFacturado ?? f.tarifaCobrada ?? 0))}</TableCell>
                <TableCell>
                  <Badge variant={f.estadoCobro === "cobrado" ? "default" : "destructive"}>
                    {f.estadoCobro}
                  </Badge>
                </TableCell>
                <TableCell>{f.estadoCobro === "pendiente" && <MarcarCobrado id={f.id} />}</TableCell>
              </TableRow>
            ))}
            {fletes.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Sin servicios de transporte registrados todavía.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default async function VentasPage({
  searchParams,
}: {
  searchParams: Promise<{ empresa?: string }>;
}) {
  const { empresa } = await searchParams;
  const filtro = empresa === "agricola" || empresa === "transporte" ? empresa : "todos";

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Ventas</h1>

      <div className="flex flex-wrap gap-1 border-b pb-2">
        {FILTROS.map((f) => {
          const activo = filtro === f.value;
          return (
            <Link
              key={f.value}
              href={f.value === "todos" ? "/ventas" : `/ventas?empresa=${f.value}`}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm",
                activo ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted/50"
              )}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {(filtro === "todos" || filtro === "agricola") && <TablaVentasAgricola />}
      {(filtro === "todos" || filtro === "transporte") && <TablaServiciosTransporte />}
    </div>
  );
}
