/** Filas crudas leídas de cada hoja del Excel, antes de transformar. */

export interface FilaProveedor {
  nombre: string;
  rut?: string;
  contacto?: string;
  telefono?: string;
  ubicacion?: string;
  condicionesPago?: string;
  plazoPagoDias?: number;
  notas?: string;
}

export interface FilaCliente {
  nombre: string;
  rut?: string;
  contacto?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  condicionesPago?: string;
  plazoPagoDias?: number;
  // Columna I del Excel (saldo) se lee solo para el reporte de validación
  // (04-validar.ts) — nunca se migra como dato (sección 10 del documento).
  saldoReferencial?: number;
}

export interface FilaCompra {
  fecha: Date;
  proveedor: string;
  variedad: string;
  calibre: string;
  kilos: number;
  nCajas?: number;
  precioKg: number;
  formaPago?: string;
  estadoPago?: string;
  nFactura?: string;
  neto?: number;
  iva?: number;
  observaciones?: string;
}

export interface FilaVenta {
  fecha: Date;
  cliente: string;
  variedad: string;
  calibre: string;
  kilos: number;
  precioKg: number;
  costoPromCompra: number; // columna L del Excel — se usa como costoKgLote al migrar
  formaPago?: string;
  estadoPago?: string;
  tipoDocumento?: string;
  nDocumento?: string;
  observaciones?: string;
}

export interface FilaFlujoCaja {
  fecha: Date;
  tipo: string; // "Cobro venta" | "Pago a proveedor" | otros
  entidad: string; // nombre del cliente o proveedor
  monto: number;
  medioPago?: string;
  referencia?: string;
}

export interface FilaGasto {
  fecha: Date;
  categoria: string;
  descripcion?: string;
  pagadoA?: string;
  monto: number;
  formaPago?: string;
  estadoPago?: string;
}

export interface DatosExcel {
  proveedores: FilaProveedor[];
  clientes: FilaCliente[];
  compras: FilaCompra[];
  ventas: FilaVenta[];
  flujoCaja: FilaFlujoCaja[];
  gastos: FilaGasto[];
}
