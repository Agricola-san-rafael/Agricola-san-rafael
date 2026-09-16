import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getSession } from "@/lib/auth";
import { listarTiposCaja } from "@/modules/cajas/service";
import { AjustarCajaDialog } from "./ajustar-caja-dialog";

export default async function CajasPage() {
  const [session, tipos] = await Promise.all([getSession(), listarTiposCaja()]);
  const esAdmin = session?.rol === "admin";

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Cajas</h1>
      <p className="text-muted-foreground">
        Stock manual de cajas reutilizables para almacenar palta — se ajusta a mano, no se
        descuenta automáticamente al comprar o vender.
      </p>

      <div className="max-w-lg overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Capacidad</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              {esAdmin && <TableHead className="text-right">Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {tipos.map((t) => (
              <TableRow key={t.id}>
                <TableCell>{t.nombre}</TableCell>
                <TableCell className="text-right">
                  {t.capacidadKg ? `${Number(t.capacidadKg)} kg` : "—"}
                </TableCell>
                <TableCell className="text-right">{t.stockActual}</TableCell>
                {esAdmin && (
                  <TableCell className="text-right">
                    <AjustarCajaDialog
                      tipoCajaId={t.id}
                      nombre={t.nombre}
                      stockActual={t.stockActual}
                    />
                  </TableCell>
                )}
              </TableRow>
            ))}
            {tipos.length === 0 && (
              <TableRow>
                <TableCell colSpan={esAdmin ? 4 : 3} className="text-center text-muted-foreground">
                  Sin tipos de caja registrados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
