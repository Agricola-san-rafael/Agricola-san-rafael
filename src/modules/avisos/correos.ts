import { correoConfigurado, enviarCorreo } from "@/lib/correo";
import { env } from "@/lib/env";
import {
  armarAvisoClienteNuevo,
  armarAvisoFleteNuevo,
  type Autor,
  type Aviso,
  type ClienteNuevo,
  type FleteNuevo,
} from "./mensajes";

/** Manda el aviso a administración. Nunca lanza: un fallo del correo no debe afectar lo que se estaba guardando. */
async function enviarAviso(aviso: Aviso) {
  if (!correoConfigurado) return;
  try {
    await enviarCorreo({ to: env.CORREO_AVISOS, ...aviso });
  } catch (error) {
    console.error("No se pudo enviar el aviso por correo", error);
  }
}

export function avisarClienteNuevo(cliente: ClienteNuevo, autor: Autor) {
  return enviarAviso(armarAvisoClienteNuevo(cliente, autor, new Date()));
}

export function avisarFleteNuevo(flete: FleteNuevo, autor: Autor) {
  return enviarAviso(armarAvisoFleteNuevo(flete, autor, new Date()));
}
