import { ImageResponse } from "next/og";
import { CONTACTO, kilosAproximados } from "@/modules/publicidad/contenido";
import { obtenerPublicidadDelDia } from "@/modules/publicidad/service";

export const runtime = "nodejs";

const VERDE = "#1f3d2b";
const VERDE_CLARO = "#8fbf5a";
const CREMA = "#f6f1e3";

/** estado = 1080×1920 (estados de WhatsApp e historias); cuadrado = 1080×1080 (feed de Instagram/Facebook). */
const FORMATOS = {
  estado: { width: 1080, height: 1920 },
  cuadrado: { width: 1080, height: 1080 },
} as const;

type Formato = keyof typeof FORMATOS;

function Marco({ titulo, subtitulo, children, alto }: { titulo: string; subtitulo: string; children: React.ReactNode; alto: boolean }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: VERDE,
        color: CREMA,
        padding: alto ? "120px 80px" : "64px 72px",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", fontSize: 30, letterSpacing: 6, color: VERDE_CLARO, textTransform: "uppercase" }}>
        {subtitulo}
      </div>
      <div style={{ display: "flex", fontSize: alto ? 96 : 76, fontWeight: 700, lineHeight: 1.05, marginTop: 16 }}>
        {titulo}
      </div>
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, marginTop: alto ? 72 : 40 }}>{children}</div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          borderTop: `3px solid ${VERDE_CLARO}`,
          paddingTop: 28,
        }}
      >
        <div style={{ display: "flex", fontSize: alto ? 52 : 44, fontWeight: 700 }}>WhatsApp {CONTACTO.telefono}</div>
        <div style={{ display: "flex", fontSize: 30, color: VERDE_CLARO, marginTop: 8 }}>
          {CONTACTO.ubicacion} · Despacho con transporte propio
        </div>
      </div>
    </div>
  );
}

function Fila({ izquierda, derecha, alto }: { izquierda: string; derecha: string; alto: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        fontSize: alto ? 54 : 42,
        padding: alto ? "22px 0" : "12px 0",
        borderBottom: "1px solid rgba(246,241,227,0.18)",
      }}
    >
      <span>{izquierda}</span>
      <span style={{ color: VERDE_CLARO, fontWeight: 700 }}>{derecha}</span>
    </div>
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tipo = url.searchParams.get("tipo") ?? "stock";
  const formato: Formato = url.searchParams.get("formato") === "cuadrado" ? "cuadrado" : "estado";
  const alto = formato === "estado";
  const publicidad = await obtenerPublicidadDelDia();

  let contenido: React.ReactElement;

  if (tipo === "fletes") {
    const { datos } = publicidad.fletes;
    const toneladas = datos.capacidadKg ? Math.floor(datos.capacidadKg / 1000) : null;
    const destinos = datos.destinos.length > 0 ? datos.destinos : ["Santiago", "V Región"];
    contenido = (
      <Marco titulo="Fletes disponibles" subtitulo="Transportes San Rafael" alto={alto}>
        <div style={{ display: "flex", fontSize: alto ? 46 : 38, lineHeight: 1.3, marginBottom: 32 }}>
          {toneladas ? `Camión de hasta ${toneladas} toneladas` : "Camión propio"} para fruta, bins, gamelas y carga general.
        </div>
        <div style={{ display: "flex", fontSize: 30, color: VERDE_CLARO, letterSpacing: 4, textTransform: "uppercase" }}>
          Rutas frecuentes desde Quillota
        </div>
        {destinos.slice(0, alto ? 6 : 4).map((d) => (
          <Fila key={d} izquierda={d} derecha="" alto={alto} />
        ))}
      </Marco>
    );
  } else if (tipo === "oferta") {
    const nombre = url.searchParams.get("nombre") ?? "";
    const oferta = publicidad.ofertas.find((o) => o.nombre === nombre) ?? publicidad.ofertas[0];
    if (!oferta) return new Response("No hay ofertas sugeridas hoy", { status: 404 });
    contenido = (
      <Marco titulo={`Oferta ${oferta.nombre}`} subtitulo="Palta Hass · Precio por volumen" alto={alto}>
        <div style={{ display: "flex", fontSize: alto ? 150 : 120, fontWeight: 700, color: VERDE_CLARO }}>
          {kilosAproximados(oferta.kilos).toLocaleString("es-CL")} kg
        </div>
        <div style={{ display: "flex", fontSize: alto ? 50 : 40, lineHeight: 1.3, marginTop: 24 }}>
          {oferta.nombre === "Descarte"
            ? "Ideal para guacamole, sándwich y consumo inmediato. Escríbenos y te cotizamos."
            : "Disponibles hoy con precio especial. Escríbenos y te cotizamos."}
        </div>
      </Marco>
    );
  } else {
    const productos = publicidad.productos.slice(0, alto ? 10 : 7);
    const hoy = new Date().toLocaleDateString("es-CL", { day: "numeric", month: "long", timeZone: "America/Santiago" });
    contenido = (
      <Marco titulo="Palta Hass disponible hoy" subtitulo={`Agrícola San Rafael · ${hoy}`} alto={alto}>
        {productos.length === 0 ? (
          <div style={{ display: "flex", fontSize: 44 }}>Consulta disponibilidad por WhatsApp.</div>
        ) : (
          productos.map((p) => (
            <Fila key={p.nombre} izquierda={p.nombre} derecha={`${p.kilos.toLocaleString("es-CL")} kg`} alto={alto} />
          ))
        )}
        <div style={{ display: "flex", fontSize: alto ? 40 : 32, marginTop: 32, color: CREMA }}>
          Venta por kilo, gamela o bins.
        </div>
      </Marco>
    );
  }

  const descargar = url.searchParams.get("descargar") === "1";
  return new ImageResponse(contenido, {
    ...FORMATOS[formato],
    headers: {
      "Cache-Control": "no-store",
      ...(descargar ? { "Content-Disposition": `attachment; filename="publicidad-${tipo}-${formato}.png"` } : {}),
    },
  });
}
