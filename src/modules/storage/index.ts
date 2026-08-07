import { env } from "@/lib/env";
import { localStorageAdapter } from "./local";
import { s3StorageAdapter } from "./s3";

export interface SubidaArchivo {
  buffer: Buffer;
  filename: string;
  contentType: string;
  carpeta: string;
}

export interface ArchivoAlmacenado {
  buffer: Buffer;
  contentType: string;
}

/**
 * Abstracción de almacenamiento de archivos (fotos de comprobantes).
 * `upload` devuelve una "key" opaca que se guarda en `comprobante_url`
 * (nunca una URL absoluta — el archivo se sirve autenticado vía
 * /api/v1/archivos/[...key]).
 */
export interface StorageAdapter {
  upload(archivo: SubidaArchivo): Promise<string>;
  get(key: string): Promise<ArchivoAlmacenado | null>;
  delete(key: string): Promise<void>;
}

export function getStorageAdapter(): StorageAdapter {
  return env.STORAGE_DRIVER === "s3" ? s3StorageAdapter : localStorageAdapter;
}
