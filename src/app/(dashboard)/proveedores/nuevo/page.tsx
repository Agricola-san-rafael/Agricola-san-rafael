import { listarProveedores } from "@/modules/proveedores/service";
import { parsePageParams } from "@/modules/shared/pagination";
import { ProveedorForm } from "../proveedor-form";

export default async function NuevoProveedorPage() {
  const { data: proveedoresExistentes } = await listarProveedores(
    parsePageParams(new URLSearchParams({ pageSize: "100" })),
    "agricola"
  );

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Nuevo proveedor</h1>
      <ProveedorForm proveedoresExistentes={proveedoresExistentes} />
    </div>
  );
}
