import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { obtenerCompra } from "@/modules/compras/service";
import { formatCLP } from "@/modules/shared/money";
import { formatDateCL } from "@/modules/shared/dates";
import { NotFoundError } from "@/modules/shared/errors";

export default async function CompraDetallePage({ params }: PageProps<"/compras/[id]">) {
  const { id } = await params;

  try {
    const compra = await obtenerCompra(id);

    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold">
            Compra a {compra.proveedor.nombre}
          </h1>
          <p className="text-muted-foreground">
            {formatDateCL(compra.fecha)} ·{" "}
            {compra.variedad.nombre} / {compra.calibre.codigo}
          </p>
        </div>

        <div className="grid max-w-2xl grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Total</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{formatCLP(Number(compra.total))}</p>
              <p className="text-sm text-muted-foreground">
                {Number(compra.kilos)} kg × {formatCLP(Number(compra.precioKg))}/kg
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Estado de pago</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge>{compra.estadoPago}</Badge>
              <p className="mt-2 text-sm text-muted-foreground">
                {compra.formaPago === "credito" ? "Crédito" : "Contado"}
              </p>
            </CardContent>
          </Card>
        </div>

        {compra.lote && (
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle>Lote de inventario generado</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-6 text-sm">
              <p>
                Kilos iniciales: <strong>{Number(compra.lote.kilosIniciales)} kg</strong>
              </p>
              <p>
                Kilos disponibles: <strong>{Number(compra.lote.kilosDisponibles)} kg</strong>
              </p>
              <p>
                Estado: <Badge variant="secondary">{compra.lote.estado}</Badge>
              </p>
            </CardContent>
          </Card>
        )}

        {compra.observaciones && (
          <div>
            <h2 className="text-lg font-medium">Observaciones</h2>
            <p className="text-muted-foreground">{compra.observaciones}</p>
          </div>
        )}
      </div>
    );
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
}
