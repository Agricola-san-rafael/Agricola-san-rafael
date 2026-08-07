export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { logout } from "@/modules/auth/service";
import { REFRESH_COOKIE, clearAuthCookies } from "@/lib/auth";
import { handleApiError } from "@/modules/shared/http";

export async function POST() {
  try {
    const store = await cookies();
    const rawRefreshToken = store.get(REFRESH_COOKIE)?.value;
    await logout(rawRefreshToken);
    await clearAuthCookies();
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
