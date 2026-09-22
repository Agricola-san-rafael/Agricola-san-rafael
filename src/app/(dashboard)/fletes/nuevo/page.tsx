import { prisma } from "@/lib/prisma";
import { formatDateCL } from "@/modules/shared/dates";
import { formatCLP } from "@/modules/shared/money";
import { FleteForm } from "./flete-form";

export default async function NuevoFletePage() {
  const [compras, ventas, clientesTransporte] = await Promise.all([
    prisma.compra.findMany({
      orderBy: { fecha: "desc" },
      take: 60,
      include: { proveedor: { select: { nombre: true } }, calibre: { select: { codigo: true } } },
    }),
    prisma.venta.findMany({
      where: { esAjuste: false, kilos: { gt: 0 } },
      orderBy: { fecha: "desc" },
      take: 80,
      include: { cliente: { select: { nombre: true } }, calibre: { select: { codigo: true } } },
    }),
    prisma.cliente.findMany({
      where: { empresa: "transporte", activo: true },
      orderBy: { nombre: "asc" },
    }),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Nuevo viaje</h1>
        <p className="text-muted-foreground">
          Registra el costo real del viaje y, si el transporte cobra, la tarifa. El flete se suma al
          costo de la operación a la que lo ligues.
        </p>
      </div>
      <FleteForm
        compras={compras.map((c) => ({
          value: c.id,
          label: `${formatDateCL(c.fecha)} · ${c.proveedor.nombre} · ${Number(c.kilos)} kg ${c.calibre.codigo} · ${formatCLP(Number(c.total))}`,
        }))}
        ventas={ventas.map((v) => ({
          value: v.id,
          label: `${formatDateCL(v.fecha)} · ${v.cliente.nombre} · ${Number(v.kilos)} kg ${v.calibre.codigo} · ${formatCLP(Number(v.total))}`,
        }))}
        clientesTransporte={clientesTransporte.map((c) => ({ value: c.id, label: c.nombre }))}
      />
    </div>
  );
}
