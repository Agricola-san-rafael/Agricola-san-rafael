import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { obtenerProveedor } from "@/modules/proveedores/service";
import { formatCLP } from "@/modules/shared/money";
import { NotFoundError } from "@/modules/shared/errors";
import { ProveedorForm } from "../proveedor-form";
import { PagoForm } from "./pago-form";

export default async function ProveedorDetallePage({
  params,
}: PageProps<"/proveedores/[id]">) {
  const { id } = await params;

  try {
    const proveedor = await obtenerProveedor(id);

    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold">{proveedor.nombre}</h1>
          <p className="text-muted-foreground">Detalle del proveedor</p>
        </div>

        <Card className="max-w-sm">
          <CardHeader>
            <CardTitle>Saldo pendiente (cuentas por pagar)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{formatCLP(proveedor.saldoPendiente)}</p>
          </CardContent>
        </Card>

        <ProveedorForm proveedor={proveedor} />

        <div>
          <h2 className="mb-2 text-lg font-medium">Registrar pago</h2>
          <PagoForm proveedorId={proveedor.id} />
        </div>
      </div>
    );
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
}
