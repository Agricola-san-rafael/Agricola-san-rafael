"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface Cuenta {
  id: string;
  descripcion: string;
}

export function CuentasOrigen({ clienteId, cuentas }: { clienteId: string; cuentas: Cuenta[] }) {
  const router = useRouter();
  const [quitando, setQuitando] = useState<string | null>(null);

  async function quitar(cuentaId: string) {
    setQuitando(cuentaId);
    try {
      const res = await fetch(`/api/v1/clientes/${clienteId}/cuentas-origen/${cuentaId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "No se pudo quitar la cuenta");
        return;
      }
      toast.success("Cuenta quitada");
      router.refresh();
    } finally {
      setQuitando(null);
    }
  }

  return (
    <div>
      <h2 className="mb-1 text-lg font-medium">Cuentas desde las que paga</h2>
      <p className="mb-2 text-sm text-muted-foreground">
        La app las aprende al registrar sus pagos desde un comprobante, y así reconoce al cliente la
        próxima vez. Si una quedó mal asociada, quítala.
      </p>
      {cuentas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no hay cuentas guardadas.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {cuentas.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
              <span>{c.descripcion}</span>
              <Button type="button" variant="ghost" size="sm" disabled={quitando === c.id} onClick={() => quitar(c.id)}>
                {quitando === c.id ? "Quitando..." : "Quitar"}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
