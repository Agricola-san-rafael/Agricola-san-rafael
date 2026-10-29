import { listarTodosLosClientes } from "@/modules/clientes/service";
import { ClienteForm } from "../cliente-form";

export default async function NuevoClientePage() {
  const clientesExistentes = await listarTodosLosClientes("agricola");

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Nuevo cliente</h1>
      <ClienteForm clientesExistentes={clientesExistentes} />
    </div>
  );
}
