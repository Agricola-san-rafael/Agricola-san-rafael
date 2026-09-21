import { Prisma } from "@/generated/prisma/client";

const TASA_IVA = new Prisma.Decimal("0.19");

export interface MontosCompra {
  total: Prisma.Decimal;
  costoKg: Prisma.Decimal;
  neto?: Prisma.Decimal;
  iva?: Prisma.Decimal;
}

/**
 * Montos de una compra según cómo se ingresó el precio.
 * - Proveedor sin IVA, o compra cargada con neto/IVA (como las facturas leídas
 *   por la IA): el precio ya es el que se paga; total y costo = kilos x precio.
 * - Proveedor que factura con IVA y compra cargada solo con precio: se asume que
 *   el precio es neto, y se suma 19% al total (lo que se paga) y al costo por kilo.
 */
export function calcularMontosCompra(params: {
  kilos: Prisma.Decimal;
  precioKg: Prisma.Decimal;
  facturaConIva: boolean;
  informoNetoOIva: boolean;
}): MontosCompra {
  const { kilos, precioKg, facturaConIva, informoNetoOIva } = params;
  if (!facturaConIva || informoNetoOIva) {
    return { total: kilos.mul(precioKg), costoKg: precioKg };
  }
  const neto = kilos.mul(precioKg).toDecimalPlaces(2);
  const iva = neto.mul(TASA_IVA).toDecimalPlaces(2);
  return {
    total: neto.add(iva),
    costoKg: precioKg.mul(TASA_IVA.add(1)).toDecimalPlaces(2),
    neto,
    iva,
  };
}

/** Una compra existente está cargada con precio neto si es de un proveedor con IVA y su total no coincide con kilos x precio. */
export function compraTienePrecioNeto(compra: {
  kilos: Prisma.Decimal;
  precioKg: Prisma.Decimal;
  total: Prisma.Decimal;
  neto: Prisma.Decimal | null;
}): boolean {
  if (compra.neto === null) return true;
  return compra.total.sub(compra.kilos.mul(compra.precioKg)).abs().gt(1);
}
