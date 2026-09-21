export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { loginSchema } from "@/modules/auth/schema";
import { login } from "@/modules/auth/service";
import { setAuthCookies } from "@/lib/auth";
import { handleApiError } from "@/modules/shared/http";

export async function POST(request: Request) {
  try {
    const body = loginSchema.parse(await request.json());
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
    const { accessToken, refreshToken, usuario } = await login(body.email, body.password, ip);
    await setAuthCookies(accessToken, refreshToken);
    return NextResponse.json({ accessToken, refreshToken, usuario });
  } catch (error) {
    return handleApiError(error);
  }
}
