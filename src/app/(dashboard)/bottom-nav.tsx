"use client";

import Link from "next/link";
import { useState } from "react";
import { Home, ShoppingCart, Banknote, Receipt, Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface BottomNavProps {
  otrosLinks: { href: string; label: string }[];
}

const ITEMS_PRINCIPALES = [
  { href: "/dashboard", label: "Inicio", icon: Home },
  { href: "/compras/nueva", label: "Compra", icon: ShoppingCart },
  { href: "/ventas/nueva", label: "Venta", icon: Banknote },
  { href: "/gastos/nuevo", label: "Gasto", icon: Receipt },
];

/**
 * Barra inferior de acceso rápido en móvil (sección 9: registrar una
 * compra/venta/gasto en menos de 3 pasos desde cualquier pantalla). Solo
 * visible bajo el breakpoint `md` — en desktop se usa el nav horizontal.
 */
export function BottomNav({ otrosLinks }: BottomNavProps) {
  const [abierto, setAbierto] = useState(false);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-background md:hidden">
      {ITEMS_PRINCIPALES.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="flex flex-1 flex-col items-center gap-0.5 py-2 text-muted-foreground hover:text-foreground"
        >
          <item.icon className="size-5" />
          <span className="text-[0.65rem]">{item.label}</span>
        </Link>
      ))}
      <Sheet open={abierto} onOpenChange={setAbierto}>
        <SheetTrigger className="flex flex-1 flex-col items-center gap-0.5 py-2 text-muted-foreground hover:text-foreground">
          <Menu className="size-5" />
          <span className="text-[0.65rem]">Más</span>
        </SheetTrigger>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Más opciones</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-1 p-4 pt-0">
            {otrosLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setAbierto(false)}
                className="rounded-md px-3 py-2 text-sm hover:bg-muted"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
