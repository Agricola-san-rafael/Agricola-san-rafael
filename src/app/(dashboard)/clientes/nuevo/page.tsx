import { listarClientes } from "@/modules/clientes/service";
import { parsePageParams } from "@/modules/shared/pagination";
import { ClienteForm } from "../cliente-form";

export default async function NuevoClientePage() {
  const { data: clientesExistentes } = await listarClientes(
    parsePageParams(new URLSearchParams({ pageSize: "100" })),
    "agricola"
  );

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Nuevo cliente</h1>
      <ClienteForm clientesExistentes={clientesExistentes} />
    </div>
  );
}
