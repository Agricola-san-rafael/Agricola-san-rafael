import { prisma } from "@/lib/prisma";
import { enviarPushAAdmins } from "@/modules/push/service";
import {
  agruparStock,
  destinosFrecuentes,
  sugerirOfertas,
  textoFletesGoogle,
  textoFletesRedes,
  textoFletesWhatsApp,
  textoStockGoogle,
  textoStockMarketplace,
  textoStockRedes,
  textoStockWhatsApp,
  type DatosFletes,
  type LoteParaPublicidad,
} from "./contenido";

/** Ventana para mirar a dónde se ha viajado: suficiente para tener rutas reales sin arrastrar las muy antiguas. */
const DIAS_RUTAS = 90;

async function lotesDisponibles(): Promise<LoteParaPublicidad[]> {
  const lotes = await prisma.loteInventario.findMany({
    where: { kilosDisponibles: { gt: 0 } },
    select: { kilosDisponibles: true, fechaIngreso: true, calibre: { select: { codigo: true } } },
  });
  return lotes.map((l) => ({
    calibre: l.calibre.codigo,
    kilos: Number(l.kilosDisponibles),
    fechaIngreso: l.fechaIngreso,
  }));
}

async function datosFletes(hoy: Date): Promise<DatosFletes> {
  const desde = new Date(hoy.getTime() - DIAS_RUTAS * 86_400_000);
  const viajes = await prisma.flete.findMany({
    where: { tipo: "tercero", fecha: { gte: desde } },
    select: { destino: true, kilos: true, vehiculo: true },
  });
  const capacidadKg = viajes.reduce((max, v) => Math.max(max, Number(v.kilos ?? 0)), 0);
  const vehiculos = viajes.map((v) => v.vehiculo).filter((v): v is string => !!v);
  return {
    destinos: destinosFrecuentes(viajes.map((v) => v.destino)),
    capacidadKg: capacidadKg > 0 ? capacidadKg : null,
    vehiculo: vehiculos[0] ?? null,
  };
}

export async function obtenerPublicidadDelDia(hoy: Date = new Date()) {
  const [lotes, fletes] = await Promise.all([lotesDisponibles(), datosFletes(hoy)]);
  const productos = agruparStock(lotes);

  return {
    productos,
    ofertas: sugerirOfertas(lotes, hoy),
    stock: {
      whatsapp: textoStockWhatsApp(productos, hoy),
      redes: textoStockRedes(productos),
      marketplace: textoStockMarketplace(productos),
      google: textoStockGoogle(productos),
    },
    fletes: {
      datos: fletes,
      whatsapp: textoFletesWhatsApp(fletes),
      redes: textoFletesRedes(fletes),
      google: textoFletesGoogle(fletes),
    },
  };
}

export type PublicidadDelDia = Awaited<ReturnType<typeof obtenerPublicidadDelDia>>;

/** Aviso de cada mañana al celular del dueño: la publicidad ya está armada y solo falta aprobarla. */
export async function avisarPublicidadDelDia(hoy: Date = new Date()) {
  const { productos, ofertas } = await obtenerPublicidadDelDia(hoy);
  const partes = [`${productos.length} productos en stock`];
  if (ofertas.length > 0) partes.push(`${ofertas.length} oferta${ofertas.length === 1 ? "" : "s"} sugerida${ofertas.length === 1 ? "" : "s"}`);
  return enviarPushAAdmins({
    title: "Tu publicidad del día está lista",
    body: `${partes.join(" y ")}. Revisa y publica en WhatsApp, Instagram y Marketplace.`,
    url: "/publicidad",
  });
}
