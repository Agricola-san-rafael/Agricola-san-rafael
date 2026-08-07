import { Prisma } from "@/generated/prisma/client";

export interface LoteDisponible {
  id: string;
  kilosDisponibles: Prisma.Decimal;
  costoKg: Prisma.Decimal;
  fechaIngreso: Date;
}

export interface ConsumoLote {
  loteId: string;
  kilosConsumidos: Prisma.Decimal;
  costoKgLote: Prisma.Decimal;
}

export interface ResultadoFIFO {
  consumos: ConsumoLote[];
  kilosFaltantes: Prisma.Decimal;
}

/**
 * Motor FIFO puro (sección 4.2): consume kilos de los lotes más antiguos primero.
 * `lotesOrdenados` debe venir ya ordenado por fechaIngreso ASC — el llamador
 * (el service, dentro de la transacción con FOR UPDATE) es responsable del orden.
 */
export function calcularConsumoFIFO(
  lotesOrdenados: LoteDisponible[],
  kilosSolicitados: Prisma.Decimal
): ResultadoFIFO {
  const consumos: ConsumoLote[] = [];
  let restante = kilosSolicitados;

  for (const lote of lotesOrdenados) {
    if (restante.lte(0)) break;
    const consumoDeEsteLote = Prisma.Decimal.min(restante, lote.kilosDisponibles);
    if (consumoDeEsteLote.gt(0)) {
      consumos.push({
        loteId: lote.id,
        kilosConsumidos: consumoDeEsteLote,
        costoKgLote: lote.costoKg,
      });
      restante = restante.sub(consumoDeEsteLote);
    }
  }

  return {
    consumos,
    kilosFaltantes: restante.gt(0) ? restante : new Prisma.Decimal(0),
  };
}
