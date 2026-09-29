import { listarClientes } from "@/modules/clientes/service";
import { parsePageParams } from "@/modules/shared/pagination";
import { ClienteForm } from "../../../clientes/cliente-form";

export default async function NuevoClienteTransportePage() {
  const { data: clientesExistentes } = await listarClientes(
    parsePageParams(new URLSearchParams({ pageSize: "100" })),
    "transporte"
  );

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Nuevo cliente (transporte)</h1>
      <ClienteForm empresa="transporte" volverA="/fletes/clientes" clientesExistentes={clientesExistentes} />
    </div>
  );
}
