import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { contarAlertasPendientes } from "@/modules/alertas/service";
import { LogoutButton } from "./logout-button";
import { SessionRefresher } from "./session-refresher";
import { BottomNav } from "./bottom-nav";

function navLinks(alertasPendientes: number, esAdmin: boolean) {
  return [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/compras", label: "Compras" },
    { href: "/ventas", label: "Ventas" },
    { href: "/inventario", label: "Inventario" },
    { href: "/clientes", label: "Clientes" },
    { href: "/proveedores", label: "Proveedores" },
    { href: "/gastos", label: "Gastos" },
    { href: "/flujo-caja", label: "Flujo de caja" },
    { href: "/alertas", label: "Alertas", badge: alertasPendientes || undefined },
    { href: "/reportes", label: "Reportes" },
    { href: "/configuracion/variedades", label: "Variedades" },
    { href: "/configuracion/calibres", label: "Calibres" },
    ...(esAdmin ? [{ href: "/configuracion/auditoria", label: "Auditoría" }] : []),
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
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {link.label}
            {link.badge !== undefined && (
              <Badge variant="destructive" className="px-1.5 py-0 text-[0.65rem]">
                {link.badge}
              </Badge>
            )}
          </Link>
        ))}
      </nav>
      <main className="flex-1 p-4 pb-20 md:pb-4">{children}</main>
      <BottomNav otrosLinks={NAV_LINKS} />
    </div>
  );
}
