import { getSession } from "@/lib/auth";
import { env } from "@/lib/env";
import { obtenerPorCobrar } from "@/modules/cobros/por-cobrar";
import { listarClientes } from "@/modules/clientes/service";
import { obtenerLotesDisponibles } from "@/modules/inventario/service";
import { parsePageParams } from "@/modules/shared/pagination";
import { VentaForm } from "../venta-form";

export default async function NuevaVentaPage({ searchParams }: PageProps<"/ventas/nueva">) {
  const [session, { data: clientes }, lotes, params, porCobrar] = await Promise.all([
    getSession(),
    listarClientes(parsePageParams(new URLSearchParams({ pageSize: "100" })), "agricola", true),
    obtenerLotesDisponibles(),
    searchParams,
    obtenerPorCobrar(),
  ]);
  const deudaPorCliente = new Map(porCobrar.clientes.map((d) => [d.clienteId, d]));
  const creditos = Object.fromEntries(
    clientes
      .filter((c) => deudaPorCliente.has(c.id) || c.limiteCredito !== null)
      .map((c) => {
        const deuda = deudaPorCliente.get(c.id);
        return [
          c.id,
          {
            saldo: deuda?.saldo ?? 0,
            limite: c.limiteCredito,
            diasDeudaMasAntigua: deuda?.diasDeudaMasAntigua ?? 0,
            // Sin plazo definido se usa el mismo umbral con el que la app avisa de un cliente atrasado.
            plazoDias: c.plazoPagoDias ?? env.ALERTA_DIAS_ATRASO_CLIENTE,
          },
        ];
      }),
  );
  const loteIdInicial = typeof params.loteId === "string" ? params.loteId : undefined;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Nueva venta</h1>
      <VentaForm
        clientes={clientes}
        lotes={lotes}
        esAdmin={session?.rol === "admin"}
        loteIdInicial={loteIdInicial}
        creditos={creditos}
      />
    </div>
  );
}
