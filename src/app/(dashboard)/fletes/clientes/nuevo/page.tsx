import { listarTodosLosClientes } from "@/modules/clientes/service";
import { ClienteForm } from "../../../clientes/cliente-form";

export default async function NuevoClienteTransportePage() {
  const clientesExistentes = await listarTodosLosClientes("transporte");

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Nuevo cliente (transporte)</h1>
      <ClienteForm empresa="transporte" volverA="/fletes/clientes" clientesExistentes={clientesExistentes} />
    </div>
  );
}
