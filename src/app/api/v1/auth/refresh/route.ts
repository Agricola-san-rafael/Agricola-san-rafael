export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { refresh } from "@/modules/auth/service";
import { REFRESH_COOKIE, setAuthCookies } from "@/lib/auth";
import { handleApiError } from "@/modules/shared/http";
import { UnauthorizedError } from "@/modules/shared/errors";

export async function POST(request: Request) {
  try {
    const store = await cookies();
    let rawRefreshToken = store.get(REFRESH_COOKIE)?.value;
    if (!rawRefreshToken) {
      const body = await request.json().catch(() => ({}));
      rawRefreshToken = body.refreshToken;
    }
    if (!rawRefreshToken) throw new UnauthorizedError("Refresh token requerido");

    const { accessToken, refreshToken } = await refresh(rawRefreshToken);
    await setAuthCookies(accessToken, refreshToken);
    return NextResponse.json({ accessToken, refreshToken });
  } catch (error) {
    return handleApiError(error);
  }
}
