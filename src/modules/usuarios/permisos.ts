import type { RolUsuario } from "@/generated/prisma/client";

/** Pantalla a la que va cada rol al entrar: el operador no ve el dashboard. */
export function paginaInicio(rol: RolUsuario): string {
  return rol === "operador" ? "/ventas?empresa=agricola" : "/dashboard";
}

/** El operador solo registra y consulta compras y ventas: ninguna otra pantalla. */
const PAGINAS_OPERADOR = ["/ventas", "/compras"];

export function operadorPuedeAbrirPagina(pathname: string): boolean {
  return PAGINAS_OPERADOR.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

interface ReglaApi {
  metodos: string[];
  ruta: RegExp;
}

/**
 * Lo que necesitan los formularios de compra y venta: crear la compra o la venta, leer la factura con IA,
 * dar de alta el cliente, proveedor o calibre que falte y subir la foto del documento.
 * Corregir y anular siguen siendo solo del administrador.
 */
const API_OPERADOR: ReglaApi[] = [
  { metodos: ["POST"], ruta: /^\/api\/v1\/(ventas|compras)(\/batch)?$/ },
  { metodos: ["POST"], ruta: /^\/api\/v1\/ventas\/extraer-venta$/ },
  { metodos: ["POST"], ruta: /^\/api\/v1\/compras\/extraer-factura$/ },
  { metodos: ["GET"], ruta: /^\/api\/v1\/compras\/verificar-factura$/ },
  { metodos: ["POST"], ruta: /^\/api\/v1\/(clientes|proveedores|calibres)$/ },
  { metodos: ["POST"], ruta: /^\/api\/v1\/archivos$/ },
  { metodos: ["GET"], ruta: /^\/api\/v1\/archivos\/.+$/ },
];

export function operadorPuedeUsarApi(method: string, pathname: string): boolean {
  return API_OPERADOR.some((r) => r.metodos.includes(method.toUpperCase()) && r.ruta.test(pathname));
}
