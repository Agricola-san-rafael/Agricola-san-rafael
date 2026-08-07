import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAccessToken } from "@/lib/jwt";

export const config = {
  matcher: ["/dashboard/:path*", "/api/v1/:path*"],
};

const ACCESS_COOKIE = "access_token";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/v1/auth") || pathname.startsWith("/api/v1/cron")) {
    return NextResponse.next();
  }

  const isApi = pathname.startsWith("/api/v1");
  const token = request.cookies.get(ACCESS_COOKIE)?.value;

  if (!token) {
    if (isApi) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const payload = await verifyAccessToken(token);

    // El rol solo_lectura solo puede leer (sección 7): cualquier método
    // mutador sobre la API se bloquea aquí, antes de llegar al service.
    if (isApi && payload.rol === "solo_lectura" && request.method !== "GET") {
      return NextResponse.json({ error: "No autorizado para esta acción" }, { status: 403 });
    }

    const headers = new Headers(request.headers);
    headers.set("x-user-id", payload.sub);
    headers.set("x-user-rol", payload.rol);
    return NextResponse.next({ request: { headers } });
  } catch {
    if (isApi) {
      return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }
}
