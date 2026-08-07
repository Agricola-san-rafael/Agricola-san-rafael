-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('admin', 'operador', 'solo_lectura');

-- CreateEnum
CREATE TYPE "CondicionPago" AS ENUM ('contado', 'credito');

-- CreateEnum
CREATE TYPE "EstadoPago" AS ENUM ('pagado', 'pendiente', 'parcial');

-- CreateEnum
CREATE TYPE "MedioPago" AS ENUM ('efectivo', 'transferencia', 'deposito_cajavecina', 'mercadopago', 'otro');

-- CreateEnum
CREATE TYPE "CategoriaGasto" AS ENUM ('combustible', 'flete', 'mano_obra', 'embalaje', 'servicios', 'otro');

-- CreateEnum
CREATE TYPE "FormaPagoGasto" AS ENUM ('efectivo', 'transferencia', 'otro');

-- CreateEnum
CREATE TYPE "EstadoPagoGasto" AS ENUM ('pagado', 'pendiente');

-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('boleta', 'factura', 'sin_documento');

-- CreateEnum
CREATE TYPE "EstadoLote" AS ENUM ('disponible', 'agotado');

-- CreateEnum
CREATE TYPE "TipoAlerta" AS ENUM ('cxc_vencimiento', 'cxp_vencimiento', 'sobreventa_stock', 'gasto_pendiente');

-- CreateEnum
CREATE TYPE "EntidadAlerta" AS ENUM ('venta', 'compra', 'cliente', 'proveedor');

-- CreateEnum
CREATE TYPE "EstadoAlerta" AS ENUM ('pendiente', 'enviada', 'resuelta');

-- CreateEnum
CREATE TYPE "CanalAlerta" AS ENUM ('whatsapp', 'push', 'email');

-- CreateEnum
CREATE TYPE "OrigenProspecto" AS ENUM ('feria', 'redes_sociales', 'referido', 'otro');

-- CreateEnum
CREATE TYPE "EtapaProspecto" AS ENUM ('nuevo', 'en_conversacion', 'cotizacion_enviada', 'cerrado_ganado', 'cerrado_perdido');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "rol" "RolUsuario" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proveedores" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rut" TEXT,
    "contacto" TEXT,
    "telefono" TEXT,
    "ubicacion" TEXT,
    "condiciones_pago" "CondicionPago",
    "plazo_pago_dias" INTEGER,
    "notas" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "proveedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rut" TEXT,
    "contacto" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "direccion" TEXT,
    "condiciones_pago" "CondicionPago",
    "plazo_pago_dias" INTEGER,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variedades" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "variedades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calibres" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "variedad_id" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "calibres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compras" (
    "id" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "proveedor_id" TEXT NOT NULL,
    "variedad_id" TEXT NOT NULL,
    "calibre_id" TEXT NOT NULL,
    "kilos" DECIMAL(10,2) NOT NULL,
    "n_cajas" INTEGER,
    "precio_kg" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "forma_pago" "CondicionPago" NOT NULL,
    "estado_pago" "EstadoPago" NOT NULL,
    "n_factura" TEXT,
    "neto" DECIMAL(12,2),
    "iva" DECIMAL(12,2),
    "observaciones" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "compras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lotes_inventario" (
    "id" TEXT NOT NULL,
    "compra_id" TEXT NOT NULL,
    "variedad_id" TEXT NOT NULL,
    "calibre_id" TEXT NOT NULL,
    "fecha_ingreso" DATE NOT NULL,
    "kilos_iniciales" DECIMAL(10,2) NOT NULL,
    "kilos_disponibles" DECIMAL(10,2) NOT NULL,
    "costo_kg" DECIMAL(10,2) NOT NULL,
    "estado" "EstadoLote" NOT NULL DEFAULT 'disponible',

    CONSTRAINT "lotes_inventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ventas" (
    "id" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "variedad_id" TEXT NOT NULL,
    "calibre_id" TEXT NOT NULL,
    "kilos" DECIMAL(10,2) NOT NULL,
    "precio_kg" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "costo_total" DECIMAL(12,2) NOT NULL,
    "margen" DECIMAL(12,2) NOT NULL,
    "margen_pct" DECIMAL(6,4) NOT NULL,
    "forma_pago" "CondicionPago" NOT NULL,
    "estado_pago" "EstadoPago" NOT NULL,
    "tipo_documento" "TipoDocumento" NOT NULL,
    "n_documento" TEXT,
    "observaciones" TEXT,
    "forzada" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "ventas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "venta_lotes" (
    "id" TEXT NOT NULL,
    "venta_id" TEXT NOT NULL,
    "lote_id" TEXT NOT NULL,
    "kilos_consumidos" DECIMAL(10,2) NOT NULL,
    "costo_kg_lote" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "venta_lotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos_cobro" (
    "id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "medio_pago" "MedioPago" NOT NULL,
    "referencia" TEXT,
    "comprobante_url" TEXT,
    "venta_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "movimientos_cobro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos_pago" (
    "id" TEXT NOT NULL,
    "proveedor_id" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "medio_pago" "MedioPago" NOT NULL,
    "referencia" TEXT,
    "comprobante_url" TEXT,
    "compra_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "movimientos_pago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gastos_operacionales" (
    "id" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "categoria" "CategoriaGasto" NOT NULL,
    "descripcion" TEXT,
    "pagado_a" TEXT,
    "monto" DECIMAL(12,2) NOT NULL,
    "forma_pago" "FormaPagoGasto" NOT NULL,
    "estado_pago" "EstadoPagoGasto" NOT NULL,
    "comprobante_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "gastos_operacionales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prospectos" (
    "id" TEXT NOT NULL,
    "nombre_empresa" TEXT NOT NULL,
    "telefono_whatsapp" TEXT,
    "contacto" TEXT,
    "origen" "OrigenProspecto",
    "etapa" "EtapaProspecto" NOT NULL DEFAULT 'nuevo',
    "fecha_primer_contacto" DATE,
    "ultimo_contacto" DATE,
    "proxima_accion" TEXT,
    "notas" TEXT,
    "cliente_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prospectos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alertas" (
    "id" TEXT NOT NULL,
    "tipo" "TipoAlerta" NOT NULL,
    "entidad_tipo" "EntidadAlerta" NOT NULL,
    "entidad_id" TEXT NOT NULL,
    "fecha_disparo" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoAlerta" NOT NULL DEFAULT 'pendiente',
    "canal" "CanalAlerta" NOT NULL DEFAULT 'push',
    "mensaje" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alertas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creditos_bancarios" (
    "id" TEXT NOT NULL,
    "institucion" TEXT,
    "tipo_credito" TEXT,
    "monto_original" DECIMAL(12,2),
    "n_cuotas" INTEGER,
    "tasa_interes" DECIMAL(6,4),
    "fecha_inicio" DATE,

    CONSTRAINT "creditos_bancarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cuotas_credito" (
    "id" TEXT NOT NULL,
    "credito_id" TEXT NOT NULL,
    "n_cuota" INTEGER NOT NULL,
    "fecha_vencimiento" DATE NOT NULL,
    "capital" DECIMAL(12,2),
    "interes" DECIMAL(12,2),
    "monto_cuota" DECIMAL(12,2),
    "estado_pago" "EstadoPagoGasto" NOT NULL,
    "saldo_insoluto" DECIMAL(12,2),

    CONSTRAINT "cuotas_credito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "tabla" TEXT NOT NULL,
    "registro_id" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "campo_antes" JSONB,
    "campo_despues" JSONB,
    "usuario_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "refresh_tokens_usuario_id_idx" ON "refresh_tokens"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "proveedores_rut_key" ON "proveedores"("rut");

-- CreateIndex
CREATE UNIQUE INDEX "variedades_nombre_key" ON "variedades"("nombre");

-- CreateIndex
CREATE INDEX "compras_fecha_idx" ON "compras"("fecha");

-- CreateIndex
CREATE INDEX "compras_proveedor_id_idx" ON "compras"("proveedor_id");

-- CreateIndex
CREATE UNIQUE INDEX "lotes_inventario_compra_id_key" ON "lotes_inventario"("compra_id");

-- CreateIndex
CREATE INDEX "lotes_inventario_variedad_id_calibre_id_fecha_ingreso_idx" ON "lotes_inventario"("variedad_id", "calibre_id", "fecha_ingreso");

-- CreateIndex
CREATE INDEX "ventas_fecha_idx" ON "ventas"("fecha");

-- CreateIndex
CREATE INDEX "ventas_cliente_id_idx" ON "ventas"("cliente_id");

-- CreateIndex
CREATE INDEX "movimientos_cobro_cliente_id_idx" ON "movimientos_cobro"("cliente_id");

-- CreateIndex
CREATE INDEX "movimientos_pago_proveedor_id_idx" ON "movimientos_pago"("proveedor_id");

-- CreateIndex
CREATE INDEX "gastos_operacionales_fecha_idx" ON "gastos_operacionales"("fecha");

-- CreateIndex
CREATE UNIQUE INDEX "alertas_tipo_entidad_tipo_entidad_id_fecha_disparo_key" ON "alertas"("tipo", "entidad_tipo", "entidad_id", "fecha_disparo");

-- CreateIndex
CREATE INDEX "audit_log_tabla_registro_id_idx" ON "audit_log"("tabla", "registro_id");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calibres" ADD CONSTRAINT "calibres_variedad_id_fkey" FOREIGN KEY ("variedad_id") REFERENCES "variedades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compras" ADD CONSTRAINT "compras_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "proveedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compras" ADD CONSTRAINT "compras_variedad_id_fkey" FOREIGN KEY ("variedad_id") REFERENCES "variedades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compras" ADD CONSTRAINT "compras_calibre_id_fkey" FOREIGN KEY ("calibre_id") REFERENCES "calibres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compras" ADD CONSTRAINT "compras_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lotes_inventario" ADD CONSTRAINT "lotes_inventario_compra_id_fkey" FOREIGN KEY ("compra_id") REFERENCES "compras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lotes_inventario" ADD CONSTRAINT "lotes_inventario_variedad_id_fkey" FOREIGN KEY ("variedad_id") REFERENCES "variedades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lotes_inventario" ADD CONSTRAINT "lotes_inventario_calibre_id_fkey" FOREIGN KEY ("calibre_id") REFERENCES "calibres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_variedad_id_fkey" FOREIGN KEY ("variedad_id") REFERENCES "variedades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_calibre_id_fkey" FOREIGN KEY ("calibre_id") REFERENCES "calibres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venta_lotes" ADD CONSTRAINT "venta_lotes_venta_id_fkey" FOREIGN KEY ("venta_id") REFERENCES "ventas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venta_lotes" ADD CONSTRAINT "venta_lotes_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "lotes_inventario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_cobro" ADD CONSTRAINT "movimientos_cobro_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_cobro" ADD CONSTRAINT "movimientos_cobro_venta_id_fkey" FOREIGN KEY ("venta_id") REFERENCES "ventas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_pago" ADD CONSTRAINT "movimientos_pago_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "proveedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_pago" ADD CONSTRAINT "movimientos_pago_compra_id_fkey" FOREIGN KEY ("compra_id") REFERENCES "compras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gastos_operacionales" ADD CONSTRAINT "gastos_operacionales_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prospectos" ADD CONSTRAINT "prospectos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cuotas_credito" ADD CONSTRAINT "cuotas_credito_credito_id_fkey" FOREIGN KEY ("credito_id") REFERENCES "creditos_bancarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
