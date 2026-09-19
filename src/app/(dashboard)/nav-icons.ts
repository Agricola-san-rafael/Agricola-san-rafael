import {
  LayoutDashboard,
  ShoppingCart,
  Banknote,
  Package,
  Users,
  Truck,
  Receipt,
  Wallet,
  Bell,
  BarChart3,
  Leaf,
  Ruler,
  ShieldCheck,
  UserCog,
  HandCoins,
} from "lucide-react";

export type IconoNav =
  | "dashboard"
  | "compras"
  | "ventas"
  | "inventario"
  | "clientes"
  | "porCobrar"
  | "proveedores"
  | "gastos"
  | "flujoCaja"
  | "alertas"
  | "reportes"
  | "variedades"
  | "calibres"
  | "auditoria"
  | "usuarios";

export const ICONOS_NAV: Record<IconoNav, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  compras: ShoppingCart,
  ventas: Banknote,
  inventario: Package,
  clientes: Users,
  porCobrar: HandCoins,
  proveedores: Truck,
  gastos: Receipt,
  flujoCaja: Wallet,
  alertas: Bell,
  reportes: BarChart3,
  variedades: Leaf,
  calibres: Ruler,
  auditoria: ShieldCheck,
  usuarios: UserCog,
};
