import { prisma } from "@/lib/prisma";
import { obtenerPorCobrar } from "@/modules/cobros/por-cobrar";
import { RegistrarPagos } from "./registrar-pagos";

export default async function RegistrarPagosPage() {
  const [clientes, deuda] = await Promise.all([
    prisma.cliente.findMany({
      where: { activo: true },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
    obtenerPorCobrar(),
  ]);
  const saldos = new Map(deuda.clientes.map((c) => [c.clienteId, c.saldo]));
  const lista = clientes
    .map((c) => ({ ...c, saldo: Math.round(saldos.get(c.id) ?? 0) }))
    .sort((a, b) => b.saldo - a.saldo || a.nombre.localeCompare(b.nombre));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Registrar pagos desde comprobante</h1>
        <p className="text-muted-foreground">
          Sube la foto de una transferencia o depósito. La app lee el monto y la fecha, sugiere el
          cliente y tú confirmas. Puedes subir varias a la vez.
        </p>
      </div>
      <RegistrarPagos clientes={lista} />
    </div>
  );
}
