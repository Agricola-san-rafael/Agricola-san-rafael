import { ClienteForm } from "../../../clientes/cliente-form";

export default function NuevoClienteTransportePage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Nuevo cliente (transporte)</h1>
      <ClienteForm empresa="transporte" volverA="/fletes/clientes" />
    </div>
  );
}
