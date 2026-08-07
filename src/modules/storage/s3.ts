import type { StorageAdapter } from "./index";

/**
 * Punto de extensión para activar S3 en producción (STORAGE_DRIVER=s3).
 * Implementar con @aws-sdk/client-s3 cuando se tenga un bucket/credenciales
 * — misma firma que localStorageAdapter, así que cambiar el driver no toca
 * ningún route handler que use getStorageAdapter().
 */
export const s3StorageAdapter: StorageAdapter = {
  async upload() {
    throw new Error("STORAGE_DRIVER=s3 configurado pero el adapter de S3 no está implementado todavía");
  },
  async get() {
    throw new Error("STORAGE_DRIVER=s3 configurado pero el adapter de S3 no está implementado todavía");
  },
  async delete() {
    throw new Error("STORAGE_DRIVER=s3 configurado pero el adapter de S3 no está implementado todavía");
  },
};
