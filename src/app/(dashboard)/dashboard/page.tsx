import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { LinkButton } from "@/components/ui/link-button";
import { getSession } from "@/lib/auth";
import { obtenerKPIs } from "@/modules/reportes/service";
import { obtenerValorEmpresa } from "@/modules/reportes/valor-empresa";
import { formatCLP } from "@/modules/shared/money";

function Fila({ nombre, monto, detalle, enlace }: { nombre: string; monto: number; detalle?: string; enlace?: string }) {
  const etiqueta = enlace ? (
    <Link href={enlace} className="hover:underline">
      {nombre}
    </Link>
  ) : (
    nombre
  );
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-muted-foreground">
        {etiqueta}
        {detalle && <span className="block text-xs">{detalle}</span>}
      </span>
      <span className={monto < 0 ? "text-destructive" : ""}>{formatCLP(monto)}</span>
    </div>
  );
}

function Total({ nombre, monto, grande }: { nombre: string; monto: number; grande?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 border-t pt-2 font-semibold ${grande ? "text-lg" : ""}`}>
      <span>{nombre}</span>
      <span className={monto < 0 ? "text-destructive" : ""}>{formatCLP(monto)}</span>
    </div>
  );
}

export default async function DashboardPage() {
  const session = await getSession();
  const esAdmin = session?.rol === "admin";
  const [kpis, valor] = await Promise.all([obtenerKPIs(), esAdmin ? obtenerValorEmpresa() : null]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground">Resumen del negocio y accesos rápidos.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <LinkButton href="/compras/nueva">+ Compra</LinkButton>
        <LinkButton href="/ventas/nueva">+ Venta</LinkButton>
        <LinkButton href="/gastos/nuevo">+ Gasto</LinkButton>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Ventas del mes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">{formatCLP(kpis.ventasDelMes.total)}</p>
          </CardContent>
        </Card>
        <Link href="/por-cobrar">
          <Card className="h-full transition-colors hover:bg-muted/40">
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Por cobrar</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-semibold">{formatCLP(kpis.totalCxC)}</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/por-pagar">
          <Card className="h-full transition-colors hover:bg-muted/40">
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Por pagar</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-semibold">{formatCLP(kpis.totalCxP)}</p>
            </CardContent>
          </Card>
        </Link>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Stock valorizado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">{formatCLP(kpis.stockValorizado)}</p>
          </CardContent>
        </Card>
      </div>

      {valor && (
        <Card>
          <CardHeader>
            <CardTitle>Valor de la empresa hoy</CardTitle>
            <p className="text-sm text-muted-foreground">
              Todo lo que tienes menos todo lo que debes. El stock va al costo de compra, no al precio al que lo vas a
              vender.
            </p>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-2 text-sm">
              <h3 className="font-medium">Lo que tienes</h3>
              <Fila nombre="Efectivo" monto={valor.tienes.efectivo} enlace="/flujo-caja?caja=efectivo" />
              {valor.tienes.banco > 0 && <Fila nombre="Banco" monto={valor.tienes.banco} enlace="/flujo-caja?caja=banco" />}
              <Fila
                nombre="Stock de fruta"
                monto={valor.tienes.stock}
                detalle={`${Math.round(valor.kilosStock).toLocaleString("es-CL")} kg al costo`}
                enlace="/inventario"
              />
              <Fila nombre="Por cobrar a clientes" monto={valor.tienes.porCobrar} enlace="/por-cobrar" />
              <Total nombre="Total que tienes" monto={valor.tienes.total} />
            </div>

            <div className="flex flex-col gap-2 text-sm">
              <h3 className="font-medium">Lo que debes</h3>
              <Fila nombre="Por pagar a proveedores" monto={valor.debes.porPagar} enlace="/por-pagar" />
              {valor.debes.sobregiroBanco > 0 && (
                <Fila nombre="Banco sobregirado" monto={valor.debes.sobregiroBanco} enlace="/flujo-caja?caja=banco" />
              )}
              <Total nombre="Total que debes" monto={valor.debes.total} />
            </div>

            <div className="flex flex-col gap-2 border-t pt-4 text-sm md:col-span-2">
              <Total nombre="Valor de la agrícola (capital de trabajo)" monto={valor.valorOperativo} grande />
              <Fila
                nombre="Préstamo a Transportes San Rafael"
                monto={valor.prestamoATransporte}
                detalle="Plata de la agrícola puesta en el camión; se recupera cuando el transporte la devuelve"
                enlace="/reportes/empresas?periodo=todo"
              />
              <Total nombre="Valor incluyendo el préstamo" monto={valor.valorTotal} grande />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
