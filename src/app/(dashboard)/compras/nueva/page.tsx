import { listarProveedores } from "@/modules/proveedores/service";
import { listarCalibres, listarVariedades } from "@/modules/catalogos/service";
import { parsePageParams } from "@/modules/shared/pagination";
import { CompraForm } from "../compra-form";

export default async function NuevaCompraPage() {
  const [{ data: proveedores }, variedades, calibres] = await Promise.all([
    listarProveedores(parsePageParams(new URLSearchParams({ pageSize: "100" })), true),
    listarVariedades(),
    listarCalibres(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Nueva compra</h1>
      <CompraForm proveedores={proveedores} variedades={variedades} calibres={calibres} />
    </div>
  );
}
