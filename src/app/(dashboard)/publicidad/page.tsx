import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { obtenerPublicidadDelDia } from "@/modules/publicidad/service";
import { Aviso, ImagenAviso } from "./aviso";

export default async function PublicidadPage() {
  const publicidad = await obtenerPublicidadDelDia();
  const { productos, ofertas, stock, fletes } = publicidad;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Publicidad</h1>
        <p className="text-muted-foreground">
          Avisos del día armados con el stock y los fletes reales. Sin precios: el cliente consulta por WhatsApp.
          Revisa el texto, ajústalo si quieres y publícalo.
        </p>
      </div>

      <Tabs defaultValue="paltas">
        <TabsList>
          <TabsTrigger value="paltas">Paltas</TabsTrigger>
          <TabsTrigger value="ofertas">Ofertas ({ofertas.length})</TabsTrigger>
          <TabsTrigger value="fletes">Fletes</TabsTrigger>
        </TabsList>

        <TabsContent value="paltas" className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Stock disponible hoy</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
              <div className="flex flex-col gap-3">
                {productos.length === 0 ? (
                  <p className="text-muted-foreground">No hay stock para ofrecer.</p>
                ) : (
                  <ul className="text-sm tabular-nums">
                    {productos.map((p) => (
                      <li key={p.nombre} className="flex justify-between border-b py-1">
                        <span>{p.nombre}</span>
                        <span>{p.kilos.toLocaleString("es-CL")} kg</span>
                      </li>
                    ))}
                  </ul>
                )}
                <ImagenAviso tipo="stock" alt="Imagen con el stock de palta disponible hoy" />
              </div>
              <div className="flex min-w-0 flex-col gap-6">
                <Aviso
                  titulo="WhatsApp"
                  ayuda="Para tu estado, listas de difusión y grupos de clientes."
                  textoInicial={stock.whatsapp}
                  whatsapp
                />
                <Aviso titulo="Instagram y Facebook" ayuda="Pégalo junto con la imagen cuadrada." textoInicial={stock.redes} />
                <Aviso
                  titulo="Marketplace y grupos de Facebook"
                  ayuda="La primera línea sirve de título del aviso."
                  textoInicial={stock.marketplace}
                />
                <Aviso titulo="Google (perfil de negocio)" ayuda="Publicación corta para tu ficha de Google." textoInicial={stock.google} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ofertas" className="flex flex-col gap-4">
          {ofertas.length === 0 ? (
            <p className="text-muted-foreground">Hoy no hay fruta acumulada que convenga ofertar.</p>
          ) : (
            ofertas.map((o) => (
              <Card key={o.nombre}>
                <CardHeader>
                  <CardTitle>Oferta sugerida: {o.nombre}</CardTitle>
                  <p className="text-sm text-muted-foreground">Motivo: {o.motivo}.</p>
                </CardHeader>
                <CardContent className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
                  <ImagenAviso tipo="oferta" nombre={o.nombre} alt={`Imagen de oferta de ${o.nombre}`} />
                  <Aviso
                    titulo="Texto de la oferta"
                    ayuda="Sirve para WhatsApp, Instagram, Facebook y Marketplace."
                    textoInicial={o.texto}
                    whatsapp
                  />
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="fletes" className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Transportes San Rafael</CardTitle>
              <p className="text-sm text-muted-foreground">
                Rutas sacadas de los viajes de los últimos 90 días
                {fletes.datos.destinos.length > 0 ? `: ${fletes.datos.destinos.join(", ")}` : ""}.
              </p>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
              <ImagenAviso tipo="fletes" alt="Imagen del aviso de fletes" />
              <div className="flex min-w-0 flex-col gap-6">
                <Aviso titulo="WhatsApp" ayuda="Para tu estado y grupos de agricultores." textoInicial={fletes.whatsapp} whatsapp />
                <Aviso titulo="Instagram, Facebook y Marketplace" ayuda="Pégalo junto con la imagen." textoInicial={fletes.redes} />
                <Aviso titulo="Google (perfil de negocio)" ayuda="Publicación corta para la ficha del transporte." textoInicial={fletes.google} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
