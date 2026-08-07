import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { obtenerStockActual } from "@/modules/inventario/service";

export default async function InventarioPage() {
  const stock = await obtenerStockActual();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Inventario</h1>
        <Link href="/inventario/lotes" className="text-sm text-primary hover:underline">
          Ver detalle de lotes
        </Link>
      </div>
      <p className="text-muted-foreground">
        Stock actual agregado por variedad y calibre (calculado en vivo desde los lotes).
      </p>

      <div className="max-w-lg overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Variedad</TableHead>
              <TableHead>Calibre</TableHead>
              <TableHead className="text-right">Stock</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stock.map((s) => (
              <TableRow key={`${s.variedadId}-${s.calibreId}`}>
                <TableCell>{s.variedadNombre}</TableCell>
                <TableCell>{s.calibreCodigo}</TableCell>
                <TableCell className="text-right">{s.stockKg} kg</TableCell>
              </TableRow>
            ))}
            {stock.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  Sin stock disponible.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
