import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { obtenerLotesDisponibles } from "@/modules/inventario/service";
import { formatDateCL } from "@/modules/shared/dates";
import { formatCLP } from "@/modules/shared/money";

export default async function LotesPage() {
  const lotes = await obtenerLotesDisponibles();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Lotes disponibles</h1>
      <p className="text-muted-foreground">
        Ordenados por fecha de ingreso (el más antiguo primero) — así se consumen en el motor
        FIFO al vender.
      </p>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ingreso</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Variedad / Calibre</TableHead>
              <TableHead className="text-right">Iniciales</TableHead>
              <TableHead className="text-right">Disponibles</TableHead>
              <TableHead className="text-right">Costo/kg</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lotes.map((l) => (
              <TableRow key={l.id}>
                <TableCell>{formatDateCL(l.fechaIngreso)}</TableCell>
                <TableCell>{l.compra.proveedor.nombre}</TableCell>
                <TableCell>
                  {l.variedad.nombre} / {l.calibre.codigo}
                </TableCell>
                <TableCell className="text-right">{Number(l.kilosIniciales)} kg</TableCell>
                <TableCell className="text-right">{Number(l.kilosDisponibles)} kg</TableCell>
                <TableCell className="text-right">{formatCLP(Number(l.costoKg))}</TableCell>
              </TableRow>
            ))}
            {lotes.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Sin lotes disponibles.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
