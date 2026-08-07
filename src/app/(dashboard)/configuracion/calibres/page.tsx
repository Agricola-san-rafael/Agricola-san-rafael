import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listarCalibres, listarVariedades } from "@/modules/catalogos/service";
import { CalibreQuickAdd } from "./calibre-quick-add";

export default async function CalibresPage() {
  const [calibres, variedades] = await Promise.all([listarCalibres(), listarVariedades()]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Calibres</h1>
      <CalibreQuickAdd variedades={variedades} />
      <div className="max-w-lg overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Variedad</TableHead>
              <TableHead>Orden</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {calibres.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.codigo}</TableCell>
                <TableCell>{c.variedad?.nombre ?? "Cualquier variedad"}</TableCell>
                <TableCell>{c.orden}</TableCell>
              </TableRow>
            ))}
            {calibres.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  Sin calibres todavía.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
