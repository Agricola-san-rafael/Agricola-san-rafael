import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listarVariedades } from "@/modules/catalogos/service";
import { VariedadQuickAdd } from "./variedad-quick-add";

export default async function VariedadesPage() {
  const variedades = await listarVariedades();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Variedades</h1>
      <VariedadQuickAdd />
      <div className="max-w-sm overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {variedades.map((v) => (
              <TableRow key={v.id}>
                <TableCell>{v.nombre}</TableCell>
              </TableRow>
            ))}
            {variedades.length === 0 && (
              <TableRow>
                <TableCell className="text-center text-muted-foreground">
                  Sin variedades todavía.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
