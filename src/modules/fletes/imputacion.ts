/**
 * Costo del flete que se le imputa a la agrícola: la tarifa que le cobra el
 * transporte y, si no hay tarifa (costo interno), el costo real del viaje.
 */
export function costoParaAgricola(f: { costoTotal: number; tarifaCobrada: number | null }): number {
  return f.tarifaCobrada ?? f.costoTotal;
}

export interface FleteBasico {
  tipo: "compra" | "venta" | "tercero";
  compraId: string | null;
  ventaId: string | null;
  costoTotal: number;
  tarifaCobrada: number | null;
}

/**
 * Reparte el flete entre las ventas: el flete de una venta va entero a esa
 * venta, y el de una compra se divide por kilo entre las ventas que salieron
 * de ese lote (kilos consumidos / kilos de la compra).
 */
export function calcularFletePorVenta(params: {
  fletes: FleteBasico[];
  kilosPorCompra: Map<string, number>;
  consumos: { ventaId: string; compraId: string; kilos: number }[];
}): Map<string, number> {
  const porVenta = new Map<string, number>();
  const sumar = (id: string, monto: number) => porVenta.set(id, (porVenta.get(id) ?? 0) + monto);

  const fletePorCompra = new Map<string, number>();
  for (const f of params.fletes) {
    if (f.tipo === "venta" && f.ventaId) sumar(f.ventaId, costoParaAgricola(f));
    if (f.tipo === "compra" && f.compraId) {
      fletePorCompra.set(f.compraId, (fletePorCompra.get(f.compraId) ?? 0) + costoParaAgricola(f));
    }
  }

  for (const c of params.consumos) {
    const flete = fletePorCompra.get(c.compraId);
    const kilosCompra = params.kilosPorCompra.get(c.compraId);
    if (flete && kilosCompra && kilosCompra > 0) sumar(c.ventaId, (flete * c.kilos) / kilosCompra);
  }
  return porVenta;
}
