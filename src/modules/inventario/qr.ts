import QRCode from "qrcode";

/** URL que abre la venta nueva con el lote ya preseleccionado al escanear su QR. */
export function construirUrlVentaLote(origin: string, loteId: string): string {
  return `${origin}/ventas/nueva?loteId=${loteId}`;
}

export async function generarQrDataUrl(texto: string): Promise<string> {
  return QRCode.toDataURL(texto, { margin: 1, width: 320 });
}
