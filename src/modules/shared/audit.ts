import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type ClientePrisma = typeof prisma | Prisma.TransactionClient;

interface RegistrarAuditLogParams {
  tabla: string;
  registroId: string;
  accion: "create" | "update" | "delete";
  campoAntes?: Record<string, unknown>;
  campoDespues?: Record<string, unknown>;
  usuarioId?: string;
}

/**
 * Tabla de auditoría recomendada en la sección 9 (NFR) para registros
 * sensibles (montos, saldos): "quién cambió este número y cuándo". Se llama
 * desde dentro de la misma transacción que crea/actualiza el registro
 * financiero, así que un fallo de auditoría revierte también el cambio
 * (no queremos un movimiento de dinero sin su rastro de auditoría).
 */
export async function registrarAuditLog(db: ClientePrisma, params: RegistrarAuditLogParams) {
  await db.auditLog.create({
    data: {
      tabla: params.tabla,
      registroId: params.registroId,
      accion: params.accion,
      campoAntes: params.campoAntes as Prisma.InputJsonValue | undefined,
      campoDespues: params.campoDespues as Prisma.InputJsonValue | undefined,
      usuarioId: params.usuarioId,
    },
  });
}

/** Últimos cambios registrados, para responder "quién cambió este número y cuándo" (sección 9). */
export async function listarAuditLog(limite = 100) {
  return prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limite,
    include: { usuario: true },
  });
}
