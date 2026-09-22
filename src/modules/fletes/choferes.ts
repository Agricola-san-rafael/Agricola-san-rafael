import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { registrarAuditLog } from "@/modules/shared/audit";

export const movimientoChoferSchema = z.object({
  fecha: z.string().min(1, "La fecha es obligatoria"),
  chofer: z.string().trim().min(1, "Indica el chofer"),
  tipo: z.enum(["deuda", "pago"]),
  monto: z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().positive("El monto debe ser mayor a 0")),
  concepto: z.string().trim().min(3, "Describe el concepto"),
});
export type MovimientoChoferInput = z.infer<typeof movimientoChoferSchema>;

export interface SaldoChofer {
  chofer: string;
  saldo: number;
  movimientos: number;
}

/** Cuánto se le debe a cada chofer: deudas suman y pagos restan. */
export function saldosPorChofer(movs: { chofer: string; monto: number }[]): SaldoChofer[] {
  const mapa = new Map<string, SaldoChofer>();
  for (const m of movs) {
    const s = mapa.get(m.chofer) ?? { chofer: m.chofer, saldo: 0, movimientos: 0 };
    s.saldo += m.monto;
    s.movimientos += 1;
    mapa.set(m.chofer, s);
  }
  return [...mapa.values()].sort((a, b) => b.saldo - a.saldo);
}

export async function crearMovimientoChofer(input: MovimientoChoferInput, usuarioId: string) {
  return prisma.$transaction(async (tx) => {
    const mov = await tx.movimientoChofer.create({
      data: {
        fecha: new Date(input.fecha),
        chofer: input.chofer,
        monto: new Prisma.Decimal(input.tipo === "deuda" ? input.monto : -input.monto),
        concepto: input.concepto,
        createdById: usuarioId,
      },
    });
    await registrarAuditLog(tx, {
      tabla: "movimientos_chofer",
      registroId: mov.id,
      accion: "create",
      campoDespues: { chofer: input.chofer, tipo: input.tipo, monto: input.monto },
      usuarioId,
    });
    return mov;
  });
}

export async function obtenerCuentasChoferes() {
  const movimientos = await prisma.movimientoChofer.findMany({ orderBy: [{ fecha: "desc" }, { createdAt: "desc" }] });
  const saldos = saldosPorChofer(movimientos.map((m) => ({ chofer: m.chofer, monto: Number(m.monto) })));
  return { saldos, movimientos };
}
