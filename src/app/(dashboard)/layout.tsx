import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { contarAlertasPendientes } from "@/modules/alertas/service";
import { LogoutButton } from "./logout-button";
import { SessionRefresher } from "./session-refresher";
import { BottomNav } from "./bottom-nav";
import { ICONOS_NAV, type IconoNav } from "./nav-icons";

function navLinks(alertasPendientes: number, esAdmin: boolean) {
  return [
    { href: "/dashboard", label: "Dashboard", iconKey: "dashboard" as IconoNav },
    { href: "/compras", label: "Compras", iconKey: "compras" as IconoNav },
    { href: "/ventas", label: "Ventas", iconKey: "ventas" as IconoNav },
    { href: "/inventario", label: "Inventario", iconKey: "inventario" as IconoNav },
    { href: "/clientes", label: "Clientes", iconKey: "clientes" as IconoNav },
    { href: "/proveedores", label: "Proveedores", iconKey: "proveedores" as IconoNav },
    { href: "/gastos", label: "Gastos", iconKey: "gastos" as IconoNav },
    { href: "/flujo-caja", label: "Flujo de caja", iconKey: "flujoCaja" as IconoNav },
    {
      href: "/alertas",
      label: "Alertas",
      iconKey: "alertas" as IconoNav,
      badge: alertasPendientes || undefined,
    },
    { href: "/reportes", label: "Reportes", iconKey: "reportes" as IconoNav },
    { href: "/configuracion/variedades", label: "Variedades", iconKey: "variedades" as IconoNav },
    { href: "/configuracion/calibres", label: "Calibres", iconKey: "calibres" as IconoNav },
    ...(esAdmin
      ? [
          { href: "/configuracion/auditoria", label: "Auditoría", iconKey: "auditoria" as IconoNav },
          { href: "/configuracion/usuarios", label: "Usuarios", iconKey: "usuarios" as IconoNav },
        ]
      : []),
  ];
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const alertasPendientes = await contarAlertasPendientes();
  const NAV_LINKS = navLinks(alertasPendientes, session.rol === "admin");

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
      <nav className="hidden flex-wrap gap-1 border-b bg-muted/30 px-4 py-2 md:flex">
        {NAV_LINKS.map((link) => {
          const Icono = ICONOS_NAV[link.iconKey];
          return (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Icono className="size-4" />
            {link.label}
            {link.badge !== undefined && (
              <Badge variant="destructive" className="px-1.5 py-0 text-[0.65rem]">
                {link.badge}
              </Badge>
            )}
          </Link>
          );
        })}
      </nav>
      <main className="flex-1 p-4 pb-20 md:pb-4">{children}</main>
      <BottomNav otrosLinks={NAV_LINKS} />
    </div>
  );
}
