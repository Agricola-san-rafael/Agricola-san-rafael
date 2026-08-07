import { GastoForm } from "../gasto-form";

export default function NuevoGastoPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Nuevo gasto</h1>
      <GastoForm />
    </div>
  );
}
