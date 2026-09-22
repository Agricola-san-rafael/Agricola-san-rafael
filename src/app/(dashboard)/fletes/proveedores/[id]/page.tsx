import { notFound } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { obtenerProveedor, obtenerGastosProveedor } from "@/modules/proveedores/service";
import { formatCLP } from "@/modules/shared/money";
import { formatDateCL } from "@/modules/shared/dates";
import { NotFoundError } from "@/modules/shared/errors";
import { ProveedorForm } from "../../../proveedores/proveedor-form";

export default async function ProveedorTransporteDetallePage({ params }: PageProps<"/fletes/proveedores/[id]">) {
  const { id } = await params;

  try {
    const proveedor = await obtenerProveedor(id);
    const gastos = await obtenerGastosProveedor(proveedor.nombre, "transporte");

    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold">{proveedor.nombre}</h1>
          <p className="text-muted-foreground">Proveedor de Transportes San Rafael SpA</p>
        </div>

        <ProveedorForm proveedor={proveedor} empresa="transporte" volverA="/fletes/proveedores" />

        <div>
          <h2 className="mb-2 text-lg font-medium">Gastos relacionados</h2>
          <p className="mb-2 text-xs text-muted-foreground">
            Gastos operacionales del transporte cuyo &quot;pagado a&quot; coincide con este nombre. Si registras el
            gasto con un nombre distinto, no va a aparecer aquí.
          </p>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gastos.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell>{formatDateCL(g.fecha)}</TableCell>
                    <TableCell className="capitalize">{g.categoria.replace("_", " ")}</TableCell>
                    <TableCell>{g.descripcion ?? "—"}</TableCell>
                    <TableCell className="text-right">{formatCLP(Number(g.monto))}</TableCell>
                  </TableRow>
                ))}
                {gastos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Sin gastos ligados a este nombre todavía.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
}
