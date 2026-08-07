import { ProveedorForm } from "../proveedor-form";

export default function NuevoProveedorPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Nuevo proveedor</h1>
      <ProveedorForm />
    </div>
  );
}
