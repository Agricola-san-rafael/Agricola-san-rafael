import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { registrarAuditLog } from "@/modules/shared/audit";

export const movimientoEmpresasSchema = z.object({
  fecha: z.string().min(1, "La fecha es obligatoria"),
  tipo: z.enum(["prestamo", "devolucion"]),
  monto: z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().positive("El monto debe ser mayor a 0")),
  concepto: z.string().trim().min(3, "Describe el concepto"),
  referencia: z.string().trim().optional().transform((v) => (v ? v : undefined)),
});

export type MovimientoEmpresasInput = z.infer<typeof movimientoEmpresasSchema>;

/** Monto con signo: positivo si la agrícola le presta al transporte, negativo si el transporte devuelve. */
export function montoConSigno(tipo: "prestamo" | "devolucion", monto: number): number {
  return tipo === "prestamo" ? monto : -monto;
}

export async function crearMovimientoEntreEmpresas(input: MovimientoEmpresasInput, usuarioId: string) {
  return prisma.$transaction(async (tx) => {
    const mov = await tx.movimientoEntreEmpresas.create({
      data: {
        fecha: new Date(input.fecha),
        monto: new Prisma.Decimal(montoConSigno(input.tipo, input.monto)),
        concepto: input.concepto,
        referencia: input.referencia,
        createdById: usuarioId,
      },
    });
    await registrarAuditLog(tx, {
      tabla: "movimientos_entre_empresas",
      registroId: mov.id,
      accion: "create",
      campoDespues: { tipo: input.tipo, monto: input.monto, concepto: input.concepto },
      usuarioId,
    });
    return mov;
  });
}

export async function obtenerPrestamoEntreEmpresas() {
  const movimientos = await prisma.movimientoEntreEmpresas.findMany({ orderBy: [{ fecha: "desc" }, { createdAt: "desc" }] });
  const saldo = movimientos.reduce((acc, m) => acc + Number(m.monto), 0);
  return { saldo, movimientos };
}
