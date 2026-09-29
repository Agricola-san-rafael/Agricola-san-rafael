import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { obtenerLoteInventario } from "@/modules/inventario/service";
import { construirUrlVentaLote, generarQrDataUrl } from "@/modules/inventario/qr";
import { NotFoundError } from "@/modules/shared/errors";
import { BotonImprimir } from "./boton-imprimir";

export default async function QrLotePage({ params }: PageProps<"/inventario/lotes/[id]/qr">) {
  const { id } = await params;

  let lote: Awaited<ReturnType<typeof obtenerLoteInventario>>;
  try {
    lote = await obtenerLoteInventario(id);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocolo = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  const url = construirUrlVentaLote(`${protocolo}://${host}`, lote.id);
  const qrDataUrl = await generarQrDataUrl(url);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full max-w-sm items-center justify-between print:hidden">
        <Link href="/inventario/lotes" className="text-sm text-muted-foreground hover:underline">
          ← Volver a lotes
        </Link>
        <BotonImprimir />
      </div>

      <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-md border p-6 text-center print:border-0">
        <p className="font-mono text-lg font-semibold">{lote.sku}</p>
        <p className="text-sm text-muted-foreground">
          {lote.variedad.nombre} · {lote.calibre.codigo}
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element -- QR es una data URL generada al vuelo, no una imagen para optimizar */}
        <img src={qrDataUrl} alt={`Código QR del lote ${lote.sku}`} width={240} height={240} />
        <p className="text-xs text-muted-foreground">
          Escanea con la cámara del celular para abrir la venta de este lote directamente.
        </p>
      </div>
    </div>
  );
}
