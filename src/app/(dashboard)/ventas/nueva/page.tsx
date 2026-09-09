import { getSession } from "@/lib/auth";
import { listarClientes } from "@/modules/clientes/service";
import { obtenerLotesDisponibles } from "@/modules/inventario/service";
import { parsePageParams } from "@/modules/shared/pagination";
import { VentaForm } from "../venta-form";

export default async function NuevaVentaPage() {
  const [session, { data: clientes }, lotes] = await Promise.all([
    getSession(),
    listarClientes(parsePageParams(new URLSearchParams({ pageSize: "100" })), true),
    obtenerLotesDisponibles(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Nueva venta</h1>
      <VentaForm clientes={clientes} lotes={lotes} esAdmin={session?.rol === "admin"} />
    </div>
  );
}
