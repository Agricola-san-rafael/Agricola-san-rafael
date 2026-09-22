import { prisma } from "@/lib/prisma";
import { formatDateCL } from "@/modules/shared/dates";
import { formatCLP } from "@/modules/shared/money";
import { RegistrarViajes } from "./registrar-viajes";

export default async function ViajesDesdeTextoPage() {
  const [compras, ventas] = await Promise.all([
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
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Cargar viajes desde texto o foto</h1>
        <p className="text-muted-foreground">
          Escribe o pega el mensaje del viaje, o sube la foto de una factura. La app arma el viaje, tú lo
          revisas y confirmas. Puedes describir varios viajes en un mismo mensaje.
        </p>
      </div>
      <RegistrarViajes
        compras={compras.map((c) => ({
          value: c.id,
          label: `${formatDateCL(c.fecha)} · ${c.proveedor.nombre} · ${Number(c.kilos)} kg ${c.calibre.codigo} · ${formatCLP(Number(c.total))}`,
        }))}
        ventas={ventas.map((v) => ({
          value: v.id,
          label: `${formatDateCL(v.fecha)} · ${v.cliente.nombre} · ${Number(v.kilos)} kg ${v.calibre.codigo} · ${formatCLP(Number(v.total))}`,
        }))}
      />
    </div>
  );
}
