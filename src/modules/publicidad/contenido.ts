/**
 * Arma los avisos de publicidad del día (palta y fletes) a partir del stock y
 * los viajes reales. Nunca se publican precios: el dueño prefiere que el
 * cliente consulte (decisión del 23-11-2026).
 */

export const CONTACTO = {
  telefono: "+56 9 7889 3769",
  ubicacion: "Quillota",
};

/** Lo mínimo para mostrar un producto: menos que esto es un resto que no conviene ofrecer. */
const KILOS_MINIMOS = 15;
/** Un lote con al menos estos kilos y estos días en bodega se sugiere como oferta. */
const KILOS_OFERTA = 100;
const DIAS_OFERTA = 5;
/** Descarte acumulado sobre esto también se sugiere como oferta por volumen. */
const KILOS_OFERTA_DESCARTE = 500;

export interface LoteParaPublicidad {
  calibre: string;
  kilos: number;
  fechaIngreso: Date;
}

export interface ProductoPublicidad {
  nombre: string;
  kilos: number;
}

export interface OfertaSugerida {
  nombre: string;
  kilos: number;
  /** Días del lote más antiguo de la oferta (0 si se sugiere solo por volumen). */
  dias: number;
  motivo: string;
  texto: string;
}

/** Orden en que se muestran los productos: de mejor a menor calidad. */
const ORDEN = [
  "Primera Extra",
  "Primera",
  "Segunda",
  "Tercera",
  "Cuarta",
  "Quinta",
  "Comercial A",
  "Comercial B",
  "Comercial C",
  "Todo calibre",
  "Descarte",
];

/**
 * Traduce el código interno del calibre (ej. "COM B CAT2", "20 CAT1") al
 * nombre que entiende un cliente. Los sufijos CAT son de la planilla de Betta.
 */
export function nombreComercial(codigo: string): string {
  const base = codigo.replace(/\s*CAT\s*\d+(\.\d+)?\s*$/i, "").trim();
  const b = base.toLowerCase();
  if (b === "primera con extra" || b === "primera extra") return "Primera Extra";
  if (b.startsWith("com ")) return `Comercial ${base.slice(4).trim().toUpperCase()}`;
  if (b === "todo calibre") return "Todo calibre";
  if (b === "descarte" || b === "etiolada" || b === "revuelta") return "Descarte";
  if (/^\d+(-\d+)?$/.test(base)) return `Calibre ${base}`;
  return base.charAt(0).toUpperCase() + base.slice(1);
}

function posicion(nombre: string): number {
  const i = ORDEN.indexOf(nombre);
  return i === -1 ? ORDEN.length : i;
}

/** Kilos redondeados hacia abajo a la decena, para no prometer de más. */
export function kilosAproximados(kilos: number): number {
  return kilos >= 10 ? Math.floor(kilos / 10) * 10 : Math.floor(kilos);
}

export function agruparStock(lotes: LoteParaPublicidad[]): ProductoPublicidad[] {
  const porNombre = new Map<string, number>();
  for (const lote of lotes) {
    if (lote.kilos <= 0) continue;
    const nombre = nombreComercial(lote.calibre);
    porNombre.set(nombre, (porNombre.get(nombre) ?? 0) + lote.kilos);
  }
  return [...porNombre]
    .filter(([, kilos]) => kilos >= KILOS_MINIMOS)
    .map(([nombre, kilos]) => ({ nombre, kilos: kilosAproximados(kilos) }))
    .sort((a, b) => posicion(a.nombre) - posicion(b.nombre) || a.nombre.localeCompare(b.nombre));
}

function diasEntre(desde: Date, hasta: Date): number {
  return Math.floor((hasta.getTime() - desde.getTime()) / 86_400_000);
}

export function sugerirOfertas(lotes: LoteParaPublicidad[], hoy: Date): OfertaSugerida[] {
  const ofertas = new Map<string, OfertaSugerida>();

  for (const lote of lotes) {
    const dias = diasEntre(lote.fechaIngreso, hoy);
    if (lote.kilos < KILOS_OFERTA || dias < DIAS_OFERTA) continue;
    const nombre = nombreComercial(lote.calibre);
    const previa = ofertas.get(nombre);
    const kilos = (previa?.kilos ?? 0) + lote.kilos;
    const diasMax = Math.max(dias, previa?.dias ?? 0);
    ofertas.set(nombre, {
      nombre,
      kilos,
      dias: diasMax,
      motivo: `${kilosAproximados(kilos).toLocaleString("es-CL")} kg en bodega, lo más antiguo con ${diasMax} días`,
      texto: textoOferta(nombre, kilos),
    });
  }

  const descarte = lotes
    .filter((l) => nombreComercial(l.calibre) === "Descarte")
    .reduce((s, l) => s + l.kilos, 0);
  if (descarte >= KILOS_OFERTA_DESCARTE && !ofertas.has("Descarte")) {
    ofertas.set("Descarte", {
      nombre: "Descarte",
      kilos: descarte,
      dias: 0,
      motivo: `${kilosAproximados(descarte).toLocaleString("es-CL")} kg de descarte acumulado`,
      texto: textoOferta("Descarte", descarte),
    });
  }

  return [...ofertas.values()].sort((a, b) => b.kilos - a.kilos);
}

function textoOferta(nombre: string, kilos: number): string {
  const kg = kilosAproximados(kilos).toLocaleString("es-CL");
  const uso = nombre === "Descarte" ? " Ideal para guacamole, sándwich y consumo inmediato." : "";
  return [
    `🔥 OFERTA en palta Hass ${nombre}`,
    `Tenemos ${kg} kg disponibles con precio especial por volumen.${uso}`,
    `📍 ${CONTACTO.ubicacion} · 📲 ${CONTACTO.telefono}`,
    "Escríbenos y te cotizamos.",
  ].join("\n");
}

function fechaCorta(hoy: Date): string {
  return hoy.toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Santiago",
  });
}

function lineasProductos(productos: ProductoPublicidad[]): string[] {
  return productos.map((p) => `• ${p.nombre}: ${p.kilos.toLocaleString("es-CL")} kg`);
}

/** Texto corto para estados, listas de difusión y grupos de WhatsApp. */
export function textoStockWhatsApp(productos: ProductoPublicidad[], hoy: Date): string {
  return [
    `🥑 *Palta Hass disponible hoy* — ${fechaCorta(hoy)}`,
    "",
    ...lineasProductos(productos),
    "",
    "Venta por kilo, gamela o bins. Despacho con transporte propio 🚚",
    `📍 ${CONTACTO.ubicacion} · 📲 ${CONTACTO.telefono}`,
    "¡Escríbenos y te cotizamos!",
  ].join("\n");
}

/** Texto con hashtags para Instagram y Facebook. */
export function textoStockRedes(productos: ProductoPublicidad[]): string {
  return [
    "🥑 Palta Hass de Quillota, directo del productor.",
    "",
    "Hoy tenemos:",
    ...lineasProductos(productos),
    "",
    "Vendemos por kilo, gamela o bins a verdulerías, restaurantes, ferias y distribuidores. Despacho con transporte propio 🚚",
    `📲 Cotiza por WhatsApp al ${CONTACTO.telefono}`,
    "",
    "#paltahass #palta #quillota #aguacate #verduleria #feria #mayorista #frutasyverduras #chile",
  ].join("\n");
}

/** Texto para Facebook Marketplace y grupos de compra-venta: título + descripción. */
export function textoStockMarketplace(productos: ProductoPublicidad[]): string {
  return [
    "Palta Hass por mayor — Quillota (despacho a domicilio)",
    "",
    "Palta Hass directo del productor. Disponible hoy:",
    ...lineasProductos(productos),
    "",
    "Venta por kilo, gamela o bins. Despachamos con camión propio.",
    `Precios por WhatsApp: ${CONTACTO.telefono}`,
  ].join("\n");
}

/** Texto para la publicación del Perfil de Negocio de Google. */
export function textoStockGoogle(productos: ProductoPublicidad[]): string {
  const nombres = productos.map((p) => p.nombre).join(", ");
  return [
    `Palta Hass disponible esta semana en Quillota: ${nombres}.`,
    "Venta por mayor y menor (kilo, gamela o bins) con despacho propio.",
    `Cotiza por WhatsApp al ${CONTACTO.telefono}.`,
  ].join(" ");
}

export interface DatosFletes {
  destinos: string[];
  capacidadKg: number | null;
  vehiculo: string | null;
}

function capacidad(datos: DatosFletes): string {
  if (!datos.capacidadKg) return "Camión propio";
  const toneladas = Math.floor(datos.capacidadKg / 1000);
  const camion = datos.vehiculo ? `Camión ${datos.vehiculo}` : "Camión propio";
  return toneladas >= 1 ? `${camion} de hasta ${toneladas} toneladas` : camion;
}

export function textoFletesWhatsApp(datos: DatosFletes): string {
  const rutas = datos.destinos.length > 0 ? datos.destinos.join(", ") : "Santiago, V Región y regiones";
  return [
    "🚚 *Transportes San Rafael — Fletes disponibles*",
    "",
    `${capacidad(datos)} para fruta, bins, gamelas y carga general.`,
    `Viajes desde ${CONTACTO.ubicacion} a ${rutas} y donde lo necesites.`,
    "",
    "✅ Emitimos factura",
    `📲 Reserva tu flete: ${CONTACTO.telefono}`,
  ].join("\n");
}

export function textoFletesRedes(datos: DatosFletes): string {
  return [
    textoFletesWhatsApp(datos).replace(/\*/g, ""),
    "",
    "#fletes #transporte #quillota #camion #carga #fruta #bins #chile",
  ].join("\n");
}

export function textoFletesGoogle(datos: DatosFletes): string {
  const rutas = datos.destinos.length > 0 ? datos.destinos.join(", ") : "Santiago y la V Región";
  return `Transportes San Rafael: fletes desde ${CONTACTO.ubicacion} a ${rutas}. ${capacidad(datos)}. Cotiza por WhatsApp al ${CONTACTO.telefono}.`;
}

const MINUSCULAS = new Set(["de", "del", "la", "las", "los", "el", "y"]);

function sinTildes(texto: string): string {
  return texto.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function mayusculaInicial(texto: string): string {
  return texto
    .toLowerCase()
    .split(/\s+/)
    .map((p, i) => (i > 0 && MINUSCULAS.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(" ");
}

/**
 * Toma los destinos de los últimos viajes a terceros, los normaliza
 * ("Valparaiso" y "Valparaíso" cuentan igual) y deja los más frecuentes.
 */
export function destinosFrecuentes(destinos: (string | null)[], maximo = 5): string[] {
  const conteo = new Map<string, { nombre: string; veces: number }>();
  for (const d of destinos) {
    if (!d) continue;
    const limpio = d.split(/→|->/).pop()!.trim();
    if (!limpio || /quillota/i.test(limpio)) continue;
    const clave = sinTildes(limpio).toLowerCase();
    const nombre = mayusculaInicial(limpio);
    const previo = conteo.get(clave);
    if (previo) {
      previo.veces++;
      // Si alguna vez se escribió con tilde, esa es la forma correcta.
      if (nombre !== sinTildes(nombre)) previo.nombre = nombre;
    } else conteo.set(clave, { nombre, veces: 1 });
  }
  return [...conteo.values()]
    .sort((a, b) => b.veces - a.veces || a.nombre.localeCompare(b.nombre))
    .slice(0, maximo)
    .map((d) => d.nombre);
}
