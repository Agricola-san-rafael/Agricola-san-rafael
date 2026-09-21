import { prisma } from "@/lib/prisma";
import { diferenciaDiasUTC } from "@/modules/shared/dates";
import { repartirCobros as repartirPagos, separarAbonos } from "@/modules/cobros/estado-pago";

export interface DeudaProveedor {
  proveedorId: string;
  nombre: string;
  telefono: string | null;
  facturaConIva: boolean;
  saldo: number;
  hasta30: number;
  de31a60: number;
  mas60: number;
  diasDeudaMasAntigua: number;
}

export interface ResumenPorPagar {
  proveedores: DeudaProveedor[];
  total: number;
  hasta30: number;
  de31a60: number;
  mas60: number;
}

/**
 * Lo que se debe a cada proveedor, separado por antigüedad (días desde la fecha
 * de la compra). Lo pagado se aplica a las compras más antiguas primero.
 */
export async function obtenerPorPagar(hoy: Date = new Date()): Promise<ResumenPorPagar> {
  const [compras, pagos] = await Promise.all([
    prisma.compra.findMany({
      orderBy: [{ fecha: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        proveedorId: true,
        fecha: true,
        total: true,
        proveedor: { select: { nombre: true, telefono: true, facturaConIva: true } },
      },
    }),
    prisma.movimientoPago.findMany({ select: { proveedorId: true, compraId: true, monto: true } }),
  ]);

  const pagosPorProveedor = new Map<string, typeof pagos>();
  for (const p of pagos) {
    const lista = pagosPorProveedor.get(p.proveedorId) ?? [];
    lista.push(p);
    pagosPorProveedor.set(p.proveedorId, lista);
  }
  const comprasPorProveedor = new Map<string, typeof compras>();
  for (const c of compras) {
    const lista = comprasPorProveedor.get(c.proveedorId) ?? [];
    lista.push(c);
    comprasPorProveedor.set(c.proveedorId, lista);
  }

  const proveedores: DeudaProveedor[] = [];
  for (const [proveedorId, lista] of comprasPorProveedor) {
    const { abonadoPorVenta, libre } = separarAbonos(
      (pagosPorProveedor.get(proveedorId) ?? []).map((p) => ({ monto: p.monto, ventaId: p.compraId })),
      new Set(lista.map((c) => c.id)),
    );
    const deuda: DeudaProveedor = {
      proveedorId,
      nombre: lista[0].proveedor.nombre,
      telefono: lista[0].proveedor.telefono,
      facturaConIva: lista[0].proveedor.facturaConIva,
      saldo: 0,
      hasta30: 0,
      de31a60: 0,
      mas60: 0,
      diasDeudaMasAntigua: 0,
    };

    for (const { venta: compra, pendiente } of repartirPagos(lista, libre, abonadoPorVenta)) {
      if (!pendiente.gt(0)) continue;
      const monto = pendiente.toNumber();
      const dias = diferenciaDiasUTC(hoy, compra.fecha);
      deuda.saldo += monto;
      if (dias <= 30) deuda.hasta30 += monto;
      else if (dias <= 60) deuda.de31a60 += monto;
      else deuda.mas60 += monto;
      deuda.diasDeudaMasAntigua = Math.max(deuda.diasDeudaMasAntigua, dias);
    }
    if (deuda.saldo > 0) proveedores.push(deuda);
  }

  proveedores.sort((a, b) => b.saldo - a.saldo);
  const suma = (campo: "saldo" | "hasta30" | "de31a60" | "mas60") =>
    proveedores.reduce((acc, p) => acc + p[campo], 0);

  return {
    proveedores,
    total: suma("saldo"),
    hasta30: suma("hasta30"),
    de31a60: suma("de31a60"),
    mas60: suma("mas60"),
  };
}
