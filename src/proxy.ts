import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAccessToken } from "@/lib/jwt";
import { operadorPuedeAbrirPagina, operadorPuedeUsarApi, paginaInicio } from "@/modules/usuarios/permisos";

export const config = {
  // Cada pantalla del panel pasa por aquí para poder cerrarle el paso al operador a todas menos compras y ventas.
  matcher: [
    "/dashboard/:path*",
    "/alertas/:path*",
    "/clientes/:path*",
    "/compras/:path*",
    "/configuracion/:path*",
    "/fletes/:path*",
    "/flujo-caja/:path*",
    "/gastos/:path*",
    "/inventario/:path*",
    "/por-cobrar/:path*",
    "/por-pagar/:path*",
    "/proveedores/:path*",
    "/publicidad/:path*",
    "/reportes/:path*",
    "/ventas/:path*",
    "/api/v1/:path*",
  ],
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

    // El operador solo registra compras y ventas: no ve el dashboard ni el resto del panel.
    if (payload.rol === "operador") {
      if (isApi && !operadorPuedeUsarApi(request.method, pathname)) {
        return NextResponse.json({ error: "No autorizado para esta acción" }, { status: 403 });
      }
      if (!isApi && !operadorPuedeAbrirPagina(pathname)) {
        return NextResponse.redirect(new URL(paginaInicio("operador"), request.url));
      }
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
