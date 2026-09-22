"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ICONOS_NAV } from "./nav-icons";
import type { NavGroup } from "./layout";

/**
 * Un botón por grupo del menú (General / Agrícola / Transporte) que despliega
 * sus links al hacer clic, en vez de mostrarlos todos siempre abiertos —
 * mantiene el menú compacto. Implementado a mano (sin librería de menú) para
 * un comportamiento de clic simple y predecible.
 */
export function NavGroupMenu({ group }: { group: NavGroup }) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const totalBadge = group.items.reduce((s, i) => s + (i.badge ?? 0), 0);

  useEffect(() => {
    if (!abierto) return;
    function onClickFuera(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setAbierto(false);
    }
    document.addEventListener("click", onClickFuera);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("click", onClickFuera);
      document.removeEventListener("keydown", onEscape);
    };
  }, [abierto]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        {group.label}
        {totalBadge > 0 && (
          <Badge variant="destructive" className="px-1.5 py-0 text-[0.65rem]">
            {totalBadge}
          </Badge>
        )}
        <ChevronDown className="size-3.5" />
      </button>
      {abierto && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-48 rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
          {group.items.map((link) => {
            const Icono = ICONOS_NAV[link.iconKey];
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setAbierto(false)}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
              >
                <Icono className="size-4" />
                {link.label}
                {link.badge !== undefined && (
                  <Badge variant="destructive" className="ml-auto px-1.5 py-0 text-[0.65rem]">
                    {link.badge}
                  </Badge>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
