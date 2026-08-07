import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "@/lib/env";
import type { ArchivoAlmacenado, StorageAdapter, SubidaArchivo } from "./index";

const MIME_POR_EXTENSION: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".heic": "image/heic",
  ".pdf": "application/pdf",
};

function raizAbsoluta(): string {
  // La ruta viene de env porque es configurable, pero eso hace que Next.js
  // trace todo el proyecto al build (ver warning "Dynamic filesystem
  // access") — el comentario opt-out evita ese comportamiento; sigue
  // siendo solo para desarrollo local (S3 es el driver real de producción).
  return path.resolve(/* turbopackIgnore: true */ process.cwd(), env.STORAGE_LOCAL_PATH);
}

function nombreSeguro(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function upload({ buffer, filename, carpeta }: SubidaArchivo): Promise<string> {
  const key = path.posix.join(carpeta, `${randomUUID()}-${nombreSeguro(filename)}`);
  const rutaCompleta = path.join(raizAbsoluta(), key);
  await mkdir(path.dirname(rutaCompleta), { recursive: true });
  await writeFile(rutaCompleta, buffer);
  return key;
}

async function get(key: string): Promise<ArchivoAlmacenado | null> {
  try {
    const rutaCompleta = path.join(raizAbsoluta(), key);
    // Evita path traversal: la ruta resuelta debe seguir dentro de la raíz.
    if (!rutaCompleta.startsWith(raizAbsoluta())) return null;
    const buffer = await readFile(rutaCompleta);
    const ext = path.extname(key).toLowerCase();
    return { buffer, contentType: MIME_POR_EXTENSION[ext] ?? "application/octet-stream" };
  } catch {
    return null;
  }
}

async function del(key: string): Promise<void> {
  const rutaCompleta = path.join(raizAbsoluta(), key);
  if (!rutaCompleta.startsWith(raizAbsoluta())) return;
  await rm(rutaCompleta, { force: true });
}

export const localStorageAdapter: StorageAdapter = { upload, get, delete: del };
