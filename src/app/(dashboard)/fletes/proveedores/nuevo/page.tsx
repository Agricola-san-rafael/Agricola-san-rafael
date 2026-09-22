import { ProveedorForm } from "../../../proveedores/proveedor-form";

export default function NuevoProveedorTransportePage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Nuevo proveedor (transporte)</h1>
      <ProveedorForm empresa="transporte" volverA="/fletes/proveedores" />
    </div>
  );
}
