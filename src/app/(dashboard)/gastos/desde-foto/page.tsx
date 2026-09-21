import { RegistrarGastos } from "./registrar-gastos";

export default function GastosDesdeFotoPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Registrar gastos desde la foto</h1>
        <p className="text-muted-foreground">
          Sube la foto de una boleta, factura o comprobante. La app lee el monto, la fecha y la
          categoría, y tú confirmas. Puedes subir varias a la vez.
        </p>
      </div>
      <RegistrarGastos />
    </div>
  );
}
