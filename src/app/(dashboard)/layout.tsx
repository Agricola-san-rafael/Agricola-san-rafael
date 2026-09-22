import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { contarAlertasPendientes } from "@/modules/alertas/service";
import { LogoutButton } from "./logout-button";
import { SessionRefresher } from "./session-refresher";
import { BottomNav } from "./bottom-nav";
import { NavGroupMenu } from "./nav-group-menu";
import type { IconoNav } from "./nav-icons";

export interface NavLink {
  href: string;
  label: string;
  iconKey: IconoNav;
  badge?: number;
}

export interface NavGroup {
  label: string;
  items: NavLink[];
}

/**
 * El menú se separa en 3 grupos: lo de la agrícola, lo del transporte y lo
 * general (aplica a ambas empresas o es solo de configuración/admin) — las
 * dos empresas tienen su propia contabilidad y no deben verse mezcladas.
 */
function navGroups(alertasPendientes: number, esAdmin: boolean): NavGroup[] {
  return [
    {
      label: "General",
      items: [
        { href: "/dashboard", label: "Dashboard", iconKey: "dashboard" },
        { href: "/gastos", label: "Gastos", iconKey: "gastos" },
        { href: "/flujo-caja", label: "Flujo de caja", iconKey: "flujoCaja" },
        { href: "/alertas", label: "Alertas", iconKey: "alertas", badge: alertasPendientes || undefined },
        { href: "/reportes", label: "Reportes", iconKey: "reportes" },
        ...(esAdmin
          ? [
              { href: "/configuracion/auditoria", label: "Auditoría", iconKey: "auditoria" as IconoNav },
              { href: "/configuracion/usuarios", label: "Usuarios", iconKey: "usuarios" as IconoNav },
              { href: "/configuracion/respaldo", label: "Respaldo", iconKey: "respaldo" as IconoNav },
            ]
          : []),
      ],
    },
    {
      label: "Agrícola San Rafael",
      items: [
        { href: "/compras", label: "Compras", iconKey: "compras" },
        { href: "/ventas", label: "Ventas", iconKey: "ventas" },
        { href: "/inventario", label: "Inventario", iconKey: "inventario" },
        { href: "/clientes", label: "Clientes", iconKey: "clientes" },
        { href: "/proveedores", label: "Proveedores", iconKey: "proveedores" },
        { href: "/por-cobrar", label: "Por cobrar", iconKey: "porCobrar" },
        { href: "/por-pagar", label: "Por pagar", iconKey: "porPagar" },
        { href: "/configuracion/variedades", label: "Variedades", iconKey: "variedades" },
        { href: "/configuracion/calibres", label: "Calibres", iconKey: "calibres" },
      ],
    },
    {
      label: "Transportes San Rafael SpA",
      items: [
        { href: "/fletes", label: "Fletes", iconKey: "fletes" },
        { href: "/fletes/clientes", label: "Clientes", iconKey: "clientes" },
        { href: "/fletes/proveedores", label: "Proveedores", iconKey: "proveedores" },
      ],
    },
  ];
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const alertasPendientes = await contarAlertasPendientes();
  const NAV_GROUPS = navGroups(alertasPendientes, session.rol === "admin");

  return (
    <div className="flex min-h-screen flex-col">
      <SessionRefresher />
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <p className="text-sm font-medium">{session.nombre}</p>
          <p className="text-xs text-muted-foreground">{session.rol}</p>
        </div>
        <LogoutButton />
      </header>
      <nav className="hidden items-center gap-1 border-b bg-muted/30 px-4 py-2 md:flex">
        {NAV_GROUPS.map((group) => (
          <NavGroupMenu key={group.label} group={group} />
        ))}
      </nav>
      <main className="flex-1 p-4 pb-20 md:pb-4">{children}</main>
      <BottomNav groups={NAV_GROUPS} />
    </div>
  );
}
