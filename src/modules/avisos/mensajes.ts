import { formatDateCL } from "@/modules/shared/dates";
import { formatCLP } from "@/modules/shared/money";

export interface Autor {
  nombre: string;
  email: string;
}

type Numerico = number | { toNumber(): number } | null | undefined;

export interface ClienteNuevo {
  nombre: string;
  rut: string | null;
  telefono: string | null;
  email: string | null;
  empresa: "agricola" | "transporte";
}

export interface FleteNuevo {
  fecha: Date;
  tipo: "compra" | "venta" | "tercero";
  terceroNombre: string | null;
  origen: string | null;
  destino: string | null;
  kilos: Numerico;
  tarifaCobrada: Numerico;
  costoTotal: Numerico;
  observaciones: string | null;
}

export interface Aviso {
  subject: string;
  text: string;
}

const EMPRESAS = { agricola: "Agrícola San Rafael", transporte: "Transportes San Rafael" };
const TIPOS_FLETE = {
  compra: "Fruta que llega (compra)",
  venta: "Fruta que se entrega (venta)",
  tercero: "Servicio a un tercero",
};

const aNumero = (n: Numerico) => (n === null || n === undefined ? null : typeof n === "number" ? n : n.toNumber());

function cuando(fecha: Date): string {
  return fecha.toLocaleString("es-CL", {
    timeZone: "America/Santiago",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function lineas(filas: [string, string | null | undefined][]): string {
  return filas
    .filter((f): f is [string, string] => Boolean(f[1]))
    .map(([etiqueta, valor]) => `${etiqueta}: ${valor}`)
    .join("\n");
}

export function armarAvisoClienteNuevo(cliente: ClienteNuevo, autor: Autor, ahora: Date): Aviso {
  return {
    subject: `Nuevo cliente: ${cliente.nombre}`,
    text: [
      "Se creó un cliente nuevo en la aplicación.",
      "",
      lineas([
        ["Cliente", cliente.nombre],
        ["Empresa", EMPRESAS[cliente.empresa]],
        ["RUT", cliente.rut],
        ["Teléfono", cliente.telefono],
        ["Correo", cliente.email],
        ["Creado por", `${autor.nombre} (${autor.email})`],
        ["Fecha", cuando(ahora)],
      ]),
    ].join("\n"),
  };
}

export function armarAvisoFleteNuevo(flete: FleteNuevo, autor: Autor, ahora: Date): Aviso {
  const ruta = [flete.origen, flete.destino].filter(Boolean).join(" → ");
  const kilos = aNumero(flete.kilos);
  const tarifa = aNumero(flete.tarifaCobrada);
  return {
    subject: `Nuevo viaje: ${ruta || TIPOS_FLETE[flete.tipo]} (${formatDateCL(flete.fecha)})`,
    text: [
      "Se registró un viaje nuevo en la aplicación.",
      "",
      lineas([
        ["Fecha del viaje", formatDateCL(flete.fecha)],
        ["Tipo", TIPOS_FLETE[flete.tipo]],
        ["Cliente", flete.terceroNombre],
        ["Ruta", ruta],
        ["Kilos", kilos === null ? null : `${kilos} kg`],
        ["Tarifa cobrada", tarifa === null ? null : formatCLP(tarifa)],
        ["Costo del viaje", formatCLP(aNumero(flete.costoTotal) ?? 0)],
        ["Observaciones", flete.observaciones],
        ["Registrado por", `${autor.nombre} (${autor.email})`],
        ["Fecha de registro", cuando(ahora)],
      ]),
    ].join("\n"),
  };
}
