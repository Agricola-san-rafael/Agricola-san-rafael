import { listarProveedores } from "@/modules/proveedores/service";
import { parsePageParams } from "@/modules/shared/pagination";
import { ProveedorForm } from "../../../proveedores/proveedor-form";

export default async function NuevoProveedorTransportePage() {
  const { data: proveedoresExistentes } = await listarProveedores(
    parsePageParams(new URLSearchParams({ pageSize: "100" })),
    "transporte"
  );

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Nuevo proveedor (transporte)</h1>
      <ProveedorForm
        empresa="transporte"
        volverA="/fletes/proveedores"
        proveedoresExistentes={proveedoresExistentes}
      />
    </div>
  );
}
