import argon2 from "argon2";
import { cookies } from "next/headers";
import type { RolUsuario } from "@/generated/prisma/client";
import { env } from "./env";
import { parseDurationToSeconds } from "./duration";
import { verifyAccessToken, type AccessTokenPayload } from "./jwt";
import { ForbiddenError, UnauthorizedError } from "@/modules/shared/errors";

export const ACCESS_COOKIE = "access_token";
export const REFRESH_COOKIE = "refresh_token";

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password);
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

export async function setAuthCookies(accessToken: string, refreshToken: string) {
  const store = await cookies();
  store.set(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: parseDurationToSeconds(env.JWT_ACCESS_EXPIRES_IN),
  });
  store.set(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: parseDurationToSeconds(env.JWT_REFRESH_EXPIRES_IN),
  });
}

export async function clearAuthCookies() {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
}

export interface Session {
  userId: string;
  rol: RolUsuario;
  nombre: string;
  email: string;
}

function toSession(payload: AccessTokenPayload): Session {
  return { userId: payload.sub, rol: payload.rol, nombre: payload.nombre, email: payload.email };
}

/** Lee y valida la sesión desde la cookie de access token. Devuelve null si no hay sesión válida. */
export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(ACCESS_COOKIE)?.value;
  if (!token) return null;
  try {
    const payload = await verifyAccessToken(token);
    return toSession(payload);
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new UnauthorizedError();
  return session;
}

export function requireRole(session: Session, roles: RolUsuario[]) {
  if (!roles.includes(session.rol)) {
    throw new ForbiddenError();
  }
}
