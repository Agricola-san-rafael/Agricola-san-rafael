import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "./errors";

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof AppError) {
    const body: Record<string, unknown> = { error: error.message };
    if ("kilosFaltantes" in error) {
      body.kilosFaltantes = (error as { kilosFaltantes: number }).kilosFaltantes;
    }
    return NextResponse.json(body, { status: error.status });
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Datos inválidos", detalles: error.flatten() },
      { status: 400 }
    );
  }

  console.error(error);
  return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
}
