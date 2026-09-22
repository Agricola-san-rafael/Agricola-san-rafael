import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { obtenerParametrosTransporte } from "@/modules/fletes/parametros";
import { FormularioParametros } from "./formulario-parametros";

export default async function TarifasPage() {
  const session = await getSession();
  if (session?.rol !== "admin") redirect("/dashboard");
  const parametros = await obtenerParametrosTransporte();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Tarifas por km</h1>
        <p className="text-muted-foreground">
          Al registrar un viaje con los km recorridos, se sugiere el costo de combustible y la tarifa a cobrar
          multiplicando por estos valores — se pueden editar en cada viaje si el real fue distinto.
        </p>
      </div>

      <FormularioParametros combustiblePorKm={parametros.combustiblePorKm} tarifaPorKm={parametros.tarifaPorKm} />
    </div>
  );
}
