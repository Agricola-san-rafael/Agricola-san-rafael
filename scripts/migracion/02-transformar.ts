import type {
  DatosExcel,
  FilaCliente,
  FilaCompra,
  FilaFlujoCaja,
  FilaGasto,
  FilaProveedor,
  FilaVenta,
} from "./tipos";
import type { HojasExcel } from "./01-leer-excel";

/**
 * Busca el valor de una columna probando varios alias de nombre posibles
 * (case-insensitive, ignorando espacios). Los alias abajo son los
 * encabezados EXACTOS confirmados contra el archivo real
 * (Gestion_Agricola_San_Rafael.xlsx, agosto 2026) — incluyen sufijos como
 * "($)" y "(%)" porque el matching es por igualdad exacta, no por
 * substring, para evitar falsos positivos entre columnas parecidas
 * (ej. "Neto ($)" vs "Monto ($)").
 */
function buscarColumna(fila: Record<string, unknown>, alias: string[]): unknown {
  const claves = Object.keys(fila);
  for (const nombreAlias of alias) {
    const clave = claves.find((k) => k.trim().toLowerCase() === nombreAlias.toLowerCase());
    if (clave !== undefined) return fila[clave];
  }
  return undefined;
}

function texto(fila: Record<string, unknown>, alias: string[]): string | undefined {
  const valor = buscarColumna(fila, alias);
  if (valor === null || valor === undefined || valor === "") return undefined;
  return String(valor).trim();
}

function numero(fila: Record<string, unknown>, alias: string[]): number | undefined {
  const valor = buscarColumna(fila, alias);
  if (valor === null || valor === undefined || valor === "") return undefined;
  const n = typeof valor === "number" ? valor : Number(valor);
  return Number.isFinite(n) ? n : undefined;
}

/** Fechas del Excel real vienen como texto "DD-MM-AAAA", no como Date de Excel. */
function fecha(fila: Record<string, unknown>, alias: string[]): Date | undefined {
  const valor = buscarColumna(fila, alias);
  if (valor instanceof Date) return valor;
  if (typeof valor === "string" && valor.trim() !== "") {
    const m = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(valor.trim());
    if (m) {
      const [, dd, mm, yyyy] = m;
      return new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
    }
    const d = new Date(valor);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  return undefined;
}

function transformarProveedores(filas: Record<string, unknown>[]): FilaProveedor[] {
  return filas
    .map((f) => ({
      nombre: texto(f, ["Nombre / Razón Social", "Nombre", "Proveedor"]) ?? "",
      rut: texto(f, ["RUT", "Rut"]),
      contacto: texto(f, ["Contacto"]),
      telefono: texto(f, ["Teléfono", "Telefono", "Fono"]),
      ubicacion: texto(f, ["Ubicación / Predio", "Ubicación", "Ubicacion"]),
      condicionesPago: texto(f, ["Condiciones de Pago", "Condición de Pago"]),
      plazoPagoDias: numero(f, ["Plazo de Pago (días)", "Plazo Pago Días", "Plazo"]),
      notas: texto(f, ["Notas", "Observaciones"]),
    }))
    .filter((p) => p.nombre !== "");
}

function transformarClientes(filas: Record<string, unknown>[]): FilaCliente[] {
  return filas
    .map((f) => ({
      nombre: texto(f, ["Nombre / Razón Social", "Nombre", "Cliente"]) ?? "",
      rut: texto(f, ["RUT", "Rut"]),
      contacto: texto(f, ["Contacto"]),
      telefono: texto(f, ["Teléfono", "Telefono", "Fono"]),
      email: texto(f, ["Email", "Correo"]),
      direccion: texto(f, ["Dirección", "Direccion"]),
      condicionesPago: texto(f, ["Condiciones de Pago", "Condición de Pago"]),
      plazoPagoDias: numero(f, ["Plazo de Pago (días)", "Plazo Pago Días", "Plazo"]),
      // La columna "Saldo" del Excel real no tiene un encabezado de texto
      // limpio (ver README) — no se intenta leer por nombre. El saldo
      // nunca se migra como dato de todos modos (sección 10 del documento).
      saldoReferencial: undefined,
    }))
    .filter((c) => c.nombre !== "");
}

function transformarCompras(filas: Record<string, unknown>[]): FilaCompra[] {
  return filas
    .map((f) => {
      const estadoPago = texto(f, ["Estado de Pago", "Estado Pago"]);
      return {
        fecha: fecha(f, ["Fecha"]) ?? new Date(0),
        proveedor: texto(f, ["Proveedor"]) ?? "",
        variedad: texto(f, ["Variedad"]) ?? "",
        calibre: texto(f, ["Calibre"]) ?? "",
        kilos: numero(f, ["Kilos", "Kg"]) ?? 0,
        nCajas: numero(f, ["N° Cajas", "N Cajas", "Cajas"]),
        precioKg: numero(f, ["Precio/Kg ($)", "Precio Kg", "Precio por Kilo", "Precio/Kg"]) ?? 0,
        formaPago: texto(f, ["Forma de Pago"]),
        estadoPago,
        nFactura: texto(f, ["N° Factura", "N Factura", "Factura"]),
        neto: numero(f, ["Neto ($)", "Neto"]),
        iva: numero(f, ["IVA 19% ($)", "IVA ($)", "IVA"]),
        observaciones: texto(f, ["Observaciones"]),
      };
    })
    .filter((c) => c.proveedor !== "" && c.kilos > 0);
}

function transformarVentas(filas: Record<string, unknown>[]): FilaVenta[] {
  return filas
    .map((f) => {
      const estadoPago = texto(f, ["Estado de Pago", "Estado Pago"]);
      return {
        fecha: fecha(f, ["Fecha"]) ?? new Date(0),
        cliente: texto(f, ["Cliente"]) ?? "",
        variedad: texto(f, ["Variedad"]) ?? "",
        calibre: texto(f, ["Calibre"]) ?? "",
        kilos: numero(f, ["Kilos", "Kg"]) ?? 0,
        precioKg: numero(f, ["Precio/Kg ($)", "Precio de Venta", "Precio/Kg"]) ?? 0,
        // Columna "Costo Prom. Compra ($/Kg)" — se usa tal cual como
        // costoKgLote al migrar, sin re-ejecutar el motor FIFO sobre datos
        // históricos (sección 10: no alterar márgenes ya validados).
        costoPromCompra: numero(f, ["Costo Prom. Compra ($/Kg)", "Costo Prom. Compra", "Costo Promedio Compra"]) ?? 0,
        formaPago: texto(f, ["Forma de Pago"]),
        estadoPago,
        tipoDocumento: texto(f, ["Tipo Documento", "Tipo de Documento"]),
        nDocumento: texto(f, ["N° Documento", "N Documento"]),
        observaciones: texto(f, ["Observaciones"]),
      };
    })
    .filter((v) => v.cliente !== "" && v.kilos > 0);
}

/**
 * La hoja "Flujo de Caja" real NO tiene una columna de cliente/proveedor
 * separada ni una columna de monto con signo: tiene "Ingreso ($)" y
 * "Egreso ($)" en columnas separadas, y el nombre de la entidad va
 * embebido en el texto libre de "Concepto" (ej. "Abono Matías Donoso
 * (transferencia BancoEstado, op. 8080514)"). Por eso esta función recibe
 * los nombres ya conocidos de clientes/proveedores y hace matching por
 * substring para extraer la entidad — no hay forma más limpia de leerlo
 * dado el formato real de la planilla.
 */
function transformarFlujoCaja(
  filas: Record<string, unknown>[],
  nombresClientes: string[],
  nombresProveedores: string[]
): FilaFlujoCaja[] {
  function extraerEntidad(concepto: string, candidatos: string[]): string | undefined {
    const conceptoNorm = concepto.toLowerCase();
    // Se compara por nombre + primer apellido, no el nombre completo: en
    // Concepto la gente suele omitir el segundo apellido (ej. la clienta
    // "Gina Contreras Alcántara" aparece como "Abono Gina Contreras" sin
    // "Alcántara") — exigir el nombre completo dejaba esos cobros sin
    // match. Candidatos más largos primero para que un nombre compuesto
    // no sea eclipsado por una coincidencia parcial de uno más corto.
    const ordenados = [...candidatos].sort((a, b) => b.length - a.length);
    return ordenados.find((nombre) => {
      const palabras = nombre.toLowerCase().split(/\s+/);
      const claveCorta = palabras.slice(0, Math.min(2, palabras.length)).join(" ");
      return conceptoNorm.includes(claveCorta);
    });
  }

  return filas
    .map((f) => {
      const tipo = texto(f, ["Categoría", "Tipo", "Concepto"]) ?? "";
      const concepto = texto(f, ["Concepto"]) ?? "";
      const ingreso = numero(f, ["Ingreso ($)", "Ingreso"]);
      const egreso = numero(f, ["Egreso ($)", "Egreso"]);
      const tipoNorm = tipo.toLowerCase();

      let entidad: string | undefined;
      if (tipoNorm.includes("cobro")) {
        entidad = extraerEntidad(concepto, nombresClientes);
      } else if (tipoNorm.includes("pago")) {
        entidad = extraerEntidad(concepto, nombresProveedores);
      }

      return {
        fecha: fecha(f, ["Fecha"]) ?? new Date(0),
        tipo,
        entidad: entidad ?? "",
        monto: ingreso ?? egreso ?? 0,
        medioPago: concepto,
        referencia: concepto,
      };
    })
    .filter((m) => m.tipo !== "" && m.monto !== 0);
}

function transformarGastos(filas: Record<string, unknown>[]): FilaGasto[] {
  return filas
    .map((f) => ({
      fechaReal: fecha(f, ["Fecha"]),
      categoria: texto(f, ["Categoría", "Categoria"]) ?? "otro",
      descripcion: texto(f, ["Descripción", "Descripcion"]),
      pagadoA: texto(f, ["Pagado A", "Pagado a"]),
      monto: numero(f, ["Monto ($)", "Monto"]) ?? 0,
      formaPago: texto(f, ["Forma de Pago"]),
      estadoPago: texto(f, ["Estado de Pago", "Estado Pago"]),
    }))
    // Sin fecha real = fila de totales (ej. SUM de la columna Monto), no un
    // gasto real — filtrar por monto>0 solo no bastaba, ese tipo de fila
    // también tiene un monto positivo (el total).
    .filter((g) => g.fechaReal !== undefined && g.monto > 0)
    .map(({ fechaReal, ...resto }): FilaGasto => ({ ...resto, fecha: fechaReal! }));
}

export function transformarDatos(hojas: HojasExcel): DatosExcel {
  const proveedores = transformarProveedores(hojas.proveedores);
  const clientes = transformarClientes(hojas.clientes);

  return {
    proveedores,
    clientes,
    compras: transformarCompras(hojas.compras),
    ventas: transformarVentas(hojas.ventas),
    flujoCaja: transformarFlujoCaja(
      hojas.flujoCaja,
      clientes.map((c) => c.nombre),
      proveedores.map((p) => p.nombre)
    ),
    gastos: transformarGastos(hojas.gastos),
  };
}
