import { ClienteForm } from "../cliente-form";

export default function NuevoClientePage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Nuevo cliente</h1>
      <ClienteForm />
    </div>
  );
}
