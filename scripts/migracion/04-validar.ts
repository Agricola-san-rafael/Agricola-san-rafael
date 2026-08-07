import { readFile } from "node:fs/promises";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";

/**
 * Criterio de aceptación de la migración (sección 10 del documento):
 * los saldos que calculan las vistas deben coincidir, cliente por cliente y
 * proveedor por proveedor, con los saldos que hoy muestra la hoja `Resumen`
 * del Excel. El usuario debe extraer esos saldos de referencia a mano (no
 * hay forma confiable de parsear "el número final que muestra Resumen" sin
 * ver la hoja real) y guardarlos en un JSON con esta forma:
 *
 * {
 *   "clientes": [{ "nombre": "Juan Pérez", "saldoEsperado": 150000 }],
 *   "proveedores": [{ "nombre": "Packing Los Aromos", "saldoEsperado": 0 }]
 * }
 */
interface ReferenciaSaldos {
  clientes: { nombre: string; saldoEsperado: number }[];
  proveedores: { nombre: string; saldoEsperado: number }[];
}

interface SaldoRow {
  nombre: string;
  saldo_pendiente: string;
}

const TOLERANCIA_PESOS = 1; // margen por redondeo

export async function validarMigracion(databaseUrl: string, rutaReferencia: string) {
  const referencia: ReferenciaSaldos = JSON.parse(await readFile(rutaReferencia, "utf-8"));

  const adapter = new PrismaPg({ connectionString: databaseUrl });
  const prisma = new PrismaClient({ adapter });

  try {
    const [saldosClientes, saldosProveedores] = await Promise.all([
      prisma.$queryRaw<SaldoRow[]>`SELECT nombre, saldo_pendiente FROM vista_saldo_clientes`,
      prisma.$queryRaw<SaldoRow[]>`SELECT nombre, saldo_pendiente FROM vista_saldo_proveedores`,
    ]);

    const saldoClientePorNombre = new Map(saldosClientes.map((r) => [r.nombre, Number(r.saldo_pendiente)]));
    const saldoProveedorPorNombre = new Map(
      saldosProveedores.map((r) => [r.nombre, Number(r.saldo_pendiente)])
    );

    const discrepancias: string[] = [];

    for (const c of referencia.clientes) {
      const calculado = saldoClientePorNombre.get(c.nombre);
      if (calculado === undefined) {
        discrepancias.push(`Cliente "${c.nombre}": no se encontró en la base migrada`);
      } else if (Math.abs(calculado - c.saldoEsperado) > TOLERANCIA_PESOS) {
        discrepancias.push(
          `Cliente "${c.nombre}": esperado $${c.saldoEsperado}, calculado $${calculado} ` +
            `(diferencia $${(calculado - c.saldoEsperado).toFixed(2)})`
        );
      }
    }

    for (const p of referencia.proveedores) {
      const calculado = saldoProveedorPorNombre.get(p.nombre);
      if (calculado === undefined) {
        discrepancias.push(`Proveedor "${p.nombre}": no se encontró en la base migrada`);
      } else if (Math.abs(calculado - p.saldoEsperado) > TOLERANCIA_PESOS) {
        discrepancias.push(
          `Proveedor "${p.nombre}": esperado $${p.saldoEsperado}, calculado $${calculado} ` +
            `(diferencia $${(calculado - p.saldoEsperado).toFixed(2)})`
        );
      }
    }

    return {
      totalComparados: referencia.clientes.length + referencia.proveedores.length,
      discrepancias,
      exitoso: discrepancias.length === 0,
    };
  } finally {
    await prisma.$disconnect();
  }
}
