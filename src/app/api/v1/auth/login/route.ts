export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { loginSchema } from "@/modules/auth/schema";
import { login } from "@/modules/auth/service";
import { setAuthCookies } from "@/lib/auth";
import { handleApiError } from "@/modules/shared/http";

export async function POST(request: Request) {
  try {
    const body = loginSchema.parse(await request.json());
    const { accessToken, refreshToken, usuario } = await login(body.email, body.password);
    await setAuthCookies(accessToken, refreshToken);
    return NextResponse.json({ accessToken, refreshToken, usuario });
  } catch (error) {
    return handleApiError(error);
  }
}
