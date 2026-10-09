import { obtenerResumenCaja } from "@/modules/flujo-caja/service";
import { obtenerPrestamoEntreEmpresas } from "@/modules/empresas/prestamos";
import { obtenerKPIs } from "./service";

export interface EntradaValorEmpresa {
  efectivo: number;
  /** Puede ser negativo: la cuenta está sobregirada. */
  banco: number;
  stock: number;
  kilosStock: number;
  porCobrar: number;
  porPagar: number;
  /** Lo que la agrícola le ha puesto al transporte (positivo = el transporte le debe a la agrícola). */
  prestamoATransporte: number;
}

export interface ValorEmpresa {
  tienes: { efectivo: number; banco: number; stock: number; porCobrar: number; total: number };
  debes: { porPagar: number; sobregiroBanco: number; total: number };
  kilosStock: number;
  /** Lo que tienes menos lo que debes, sin contar el préstamo al transporte: es el capital de trabajo. */
  valorOperativo: number;
  prestamoATransporte: number;
  /** Valor operativo más lo que el transporte le debe a la agrícola. */
  valorTotal: number;
}

/** Junta lo que la agrícola tiene (caja, stock, lo que le deben) y lo que debe, para ver cuánto vale hoy. */
export function calcularValorEmpresa(e: EntradaValorEmpresa): ValorEmpresa {
  const banco = Math.max(0, e.banco);
  const sobregiroBanco = Math.max(0, -e.banco);
  const totalTienes = e.efectivo + banco + e.stock + e.porCobrar;
  const totalDebes = e.porPagar + sobregiroBanco;
  const valorOperativo = totalTienes - totalDebes;
  return {
    tienes: { efectivo: e.efectivo, banco, stock: e.stock, porCobrar: e.porCobrar, total: totalTienes },
    debes: { porPagar: e.porPagar, sobregiroBanco, total: totalDebes },
    kilosStock: e.kilosStock,
    valorOperativo,
    prestamoATransporte: e.prestamoATransporte,
    valorTotal: valorOperativo + e.prestamoATransporte,
  };
}

export async function obtenerValorEmpresa(): Promise<ValorEmpresa> {
  const [kpis, caja, prestamo] = await Promise.all([
    obtenerKPIs(),
    obtenerResumenCaja(),
    obtenerPrestamoEntreEmpresas(),
  ]);
  return calcularValorEmpresa({
    efectivo: caja.saldos.efectivo,
    banco: caja.saldos.banco,
    stock: kpis.stockValorizado,
    kilosStock: kpis.kilosStock,
    porCobrar: kpis.totalCxC,
    porPagar: kpis.totalCxP,
    prestamoATransporte: prestamo.saldo,
  });
}
