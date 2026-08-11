import { randomUUID } from "node:crypto";
import { del, put } from "@vercel/blob";
import { env } from "@/lib/env";
import type { ArchivoAlmacenado, StorageAdapter, SubidaArchivo } from "./index";

function token(): string {
  if (!env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("STORAGE_DRIVER=vercel-blob configurado pero falta BLOB_READ_WRITE_TOKEN");
  }
  return env.BLOB_READ_WRITE_TOKEN;
}

function nombreSeguro(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
}

/**
 * `key` es la URL completa que devuelve Vercel Blob (con sufijo aleatorio
 * impredecible). El route handler /api/v1/archivos nunca expone esa URL al
 * cliente — siempre reenvía el buffer, preservando el mismo modelo de acceso
 * autenticado que localStorageAdapter.
 */
async function upload({ buffer, filename, carpeta }: SubidaArchivo): Promise<string> {
  const path = `${carpeta}/${randomUUID()}-${nombreSeguro(filename)}`;
  const blob = await put(path, buffer, {
    access: "public",
    addRandomSuffix: true,
    token: token(),
  });
  return blob.url;
}

async function get(key: string): Promise<ArchivoAlmacenado | null> {
  try {
    const respuesta = await fetch(key);
    if (!respuesta.ok) return null;
    const buffer = Buffer.from(await respuesta.arrayBuffer());
    const contentType = respuesta.headers.get("content-type") ?? "application/octet-stream";
    return { buffer, contentType };
  } catch {
    return null;
  }
}

async function deleteBlob(key: string): Promise<void> {
  await del(key, { token: token() });
}

export const vercelBlobStorageAdapter: StorageAdapter = { upload, get, delete: deleteBlob };
