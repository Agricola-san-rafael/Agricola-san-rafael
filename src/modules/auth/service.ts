import { randomUUID, createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "@/lib/jwt";
import { env } from "@/lib/env";
import { parseDurationToSeconds } from "@/lib/duration";
import { UnauthorizedError } from "@/modules/shared/errors";
import type { Usuario } from "@/generated/prisma/client";

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

async function issueTokenPair(usuario: Usuario) {
  const accessToken = await signAccessToken({
    sub: usuario.id,
    rol: usuario.rol,
    nombre: usuario.nombre,
    email: usuario.email,
  });

  const jti = randomUUID();
  const refreshToken = await signRefreshToken({ sub: usuario.id, jti });
  const expiresAt = new Date(
    Date.now() + parseDurationToSeconds(env.JWT_REFRESH_EXPIRES_IN) * 1000
  );

  await prisma.refreshToken.create({
    data: {
      id: jti,
      usuarioId: usuario.id,
      tokenHash: hashToken(refreshToken),
      expiresAt,
    },
  });

  return { accessToken, refreshToken };
}

export async function login(email: string, password: string) {
  const usuario = await prisma.usuario.findUnique({ where: { email } });
  if (!usuario || !usuario.activo) {
    throw new UnauthorizedError("Credenciales inválidas");
  }
  const valido = await verifyPassword(usuario.passwordHash, password);
  if (!valido) {
    throw new UnauthorizedError("Credenciales inválidas");
  }

  const tokens = await issueTokenPair(usuario);
  return {
    ...tokens,
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
    },
  };
}

export async function refresh(rawRefreshToken: string) {
  let payload;
  try {
    payload = await verifyRefreshToken(rawRefreshToken);
  } catch {
    throw new UnauthorizedError("Refresh token inválido");
  }

  const stored = await prisma.refreshToken.findUnique({ where: { id: payload.jti } });
  if (!stored || stored.usuarioId !== payload.sub) {
    throw new UnauthorizedError("Refresh token inválido");
  }

  if (stored.revokedAt) {
    // Reuso de un refresh token ya rotado: posible robo de token.
    // Se revocan todas las sesiones activas del usuario por precaución.
    await prisma.refreshToken.updateMany({
      where: { usuarioId: stored.usuarioId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw new UnauthorizedError("Sesión inválida, vuelve a iniciar sesión");
  }

  if (stored.tokenHash !== hashToken(rawRefreshToken) || stored.expiresAt < new Date()) {
    throw new UnauthorizedError("Refresh token inválido o expirado");
  }

  const usuario = await prisma.usuario.findUnique({ where: { id: stored.usuarioId } });
  if (!usuario || !usuario.activo) {
    throw new UnauthorizedError("Usuario inactivo");
  }

  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  return issueTokenPair(usuario);
}

export async function logout(rawRefreshToken: string | undefined) {
  if (!rawRefreshToken) return;
  try {
    const payload = await verifyRefreshToken(rawRefreshToken);
    await prisma.refreshToken.updateMany({
      where: { id: payload.jti, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  } catch {
    // Token ya inválido/expirado: nada que revocar.
  }
}
