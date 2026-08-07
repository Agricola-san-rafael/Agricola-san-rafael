import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma } from "../../src/generated/prisma/client";
import { calcularConsumoFIFO, type LoteDisponible } from "../../src/modules/ventas/fifo";
import type { DatosExcel } from "./tipos";
import {
  normalizarCategoriaGasto,
  normalizarCondicionPago,
  normalizarEstadoPago,
  normalizarMedioPago,
  normalizarTipoDocumento,
} from "./normalizadores";

export interface ResultadoCarga {
  proveedores: number;
  clientes: number;
  variedades: number;
  calibres: number;
  compras: number;
  ventas: number;
  cobros: number;
  pagos: number;
  gastos: number;
  avisos: string[];
}

/**
 * Orquesta la carga completa dentro de una única transacción (el volumen
 * esperado, ~97 transacciones en 7 semanas según el diagnóstico, cabe sin
 * problema — sección 10 del documento).
 *
 * Decisión de diseño para reconciliar dos reglas del documento que en
 * conjunto son ambiguas si se toman literalmente:
 *   1. "el costo hardcodeado de la columna L (Costo Prom. Compra) se usa
 *      como costoKgLote al migrar — no se re-ejecuta el motor FIFO
 *      retroactivamente" (no alterar márgenes ya validados).
 *   2. "kilos_disponibles inicial [de una compra] = kilos de la fila menos
 *      lo ya vendido" (el stock migrado debe reflejar la realidad actual).
 * Se resuelven así: el motor FIFO (el mismo `calcularConsumoFIFO` que usa
 * el módulo de ventas en producción) SÍ se usa para decidir qué lote(s)
 * físicos se decrementan y en qué proporción — eso es lo que mantiene
 * `kilos_disponibles` correcto. Pero el costo financiero registrado en cada
 * `venta_lotes.costoKgLote` (y por lo tanto `venta.costoTotal`/`margen`)
 * siempre usa el valor histórico de la columna L, nunca el costo real del
 * lote consumido. Así el stock queda correcto sin tocar los márgenes.
 */
export async function cargarDatos(
  datos: DatosExcel,
  databaseUrl: string,
  { dryRun }: { dryRun: boolean }
): Promise<ResultadoCarga> {
  const adapter = new PrismaPg({ connectionString: databaseUrl });
  const prisma = new PrismaClient({ adapter });
  const avisos: string[] = [];

  try {
    const resultado = await prisma.$transaction(
      async (tx) => {
        const proveedorPorNombre = new Map<string, string>();
        const clientePorNombre = new Map<string, string>();
        const variedadPorNombre = new Map<string, string>();
        const calibrePorClave = new Map<string, string>(); // `${variedad}::${codigo}`

        for (const p of datos.proveedores) {
          const datosProveedor = {
            nombre: p.nombre,
            rut: p.rut,
            contacto: p.contacto,
            telefono: p.telefono,
            ubicacion: p.ubicacion,
            condicionesPago: p.condicionesPago ? normalizarCondicionPago(p.condicionesPago) : undefined,
            plazoPagoDias: p.plazoPagoDias,
            notas: p.notas,
          };
          // Solo se puede usar upsert (idempotente) cuando hay RUT real —
          // sin RUT no existe una clave única confiable, así que se crea
          // directo (aceptable: la migración se corre una sola vez).
          const proveedor = p.rut
            ? await tx.proveedor.upsert({
                where: { rut: p.rut },
                update: {},
                create: datosProveedor,
              })
            : await tx.proveedor.create({ data: datosProveedor });
          proveedorPorNombre.set(p.nombre, proveedor.id);
        }

        for (const c of datos.clientes) {
          const cliente = await tx.cliente.create({
            data: {
              nombre: c.nombre,
              rut: c.rut,
              contacto: c.contacto,
              telefono: c.telefono,
              email: c.email,
              direccion: c.direccion,
              condicionesPago: c.condicionesPago ? normalizarCondicionPago(c.condicionesPago) : undefined,
              plazoPagoDias: c.plazoPagoDias,
              // saldoReferencial deliberadamente NO se migra (sección 10).
            },
          });
          clientePorNombre.set(c.nombre, cliente.id);
        }

        async function idVariedad(nombre: string): Promise<string> {
          const existente = variedadPorNombre.get(nombre);
          if (existente) return existente;
          const v = await tx.variedad.upsert({
            where: { nombre },
            update: {},
            create: { nombre },
          });
          variedadPorNombre.set(nombre, v.id);
          return v.id;
        }

        async function idCalibre(variedadNombre: string, codigo: string): Promise<string> {
          const clave = `${variedadNombre}::${codigo}`;
          const existente = calibrePorClave.get(clave);
          if (existente) return existente;
          const variedadId = await idVariedad(variedadNombre);
          const encontrado = await tx.calibre.findFirst({ where: { codigo, variedadId } });
          const calibre =
            encontrado ?? (await tx.calibre.create({ data: { codigo, variedadId, orden: 0 } }));
          calibrePorClave.set(clave, calibre.id);
          return calibre.id;
        }

        // Compras → generan lote 1:1, kilos_disponibles = kilos (se ajusta
        // más abajo al reconciliar con las ventas migradas vía FIFO).
        interface LoteMigrado extends LoteDisponible {
          variedadClave: string;
        }
        const lotesPorVariedadCalibre = new Map<string, LoteMigrado[]>();
        let comprasCreadas = 0;

        const comprasOrdenadas = [...datos.compras].sort(
          (a, b) => a.fecha.getTime() - b.fecha.getTime()
        );

        for (const c of comprasOrdenadas) {
          const proveedorId = proveedorPorNombre.get(c.proveedor);
          if (!proveedorId) {
            avisos.push(`Compra omitida: proveedor "${c.proveedor}" no encontrado`);
            continue;
          }
          const variedadId = await idVariedad(c.variedad);
          const calibreId = await idCalibre(c.variedad, c.calibre);
          const kilos = new Prisma.Decimal(c.kilos);
          const precioKg = new Prisma.Decimal(c.precioKg);

          const compra = await tx.compra.create({
            data: {
              fecha: c.fecha,
              proveedorId,
              variedadId,
              calibreId,
              kilos,
              nCajas: c.nCajas,
              precioKg,
              total: kilos.mul(precioKg),
              formaPago: normalizarCondicionPago(
                c.formaPago,
                c.estadoPago ? normalizarEstadoPago(c.estadoPago) : undefined
              ),
              estadoPago: c.estadoPago ? normalizarEstadoPago(c.estadoPago) : "pagado",
              nFactura: c.nFactura,
              neto: c.neto !== undefined ? new Prisma.Decimal(c.neto) : undefined,
              iva: c.iva !== undefined ? new Prisma.Decimal(c.iva) : undefined,
              observaciones: c.observaciones,
            },
          });

          const lote = await tx.loteInventario.create({
            data: {
              compraId: compra.id,
              variedadId,
              calibreId,
              fechaIngreso: c.fecha,
              kilosIniciales: kilos,
              kilosDisponibles: kilos,
              costoKg: precioKg,
              estado: "disponible",
            },
          });

          const clave = `${c.variedad}::${c.calibre}`;
          const lista = lotesPorVariedadCalibre.get(clave) ?? [];
          lista.push({
            id: lote.id,
            kilosDisponibles: kilos,
            costoKg: precioKg,
            fechaIngreso: c.fecha,
            variedadClave: clave,
          });
          lotesPorVariedadCalibre.set(clave, lista);
          comprasCreadas++;
        }

        // Ventas → costoTotal/margen SIEMPRE desde el costo histórico de la
        // columna L; el motor FIFO solo decide qué lote(s) decrementar.
        let ventasCreadas = 0;
        const ventasOrdenadas = [...datos.ventas].sort(
          (a, b) => a.fecha.getTime() - b.fecha.getTime()
        );

        for (const v of ventasOrdenadas) {
          const clienteId = clientePorNombre.get(v.cliente);
          if (!clienteId) {
            avisos.push(`Venta omitida: cliente "${v.cliente}" no encontrado`);
            continue;
          }
          const variedadId = await idVariedad(v.variedad);
          const calibreId = await idCalibre(v.variedad, v.calibre);
          const kilos = new Prisma.Decimal(v.kilos);
          const precioKg = new Prisma.Decimal(v.precioKg);
          const costoHistorico = new Prisma.Decimal(v.costoPromCompra);
          const total = kilos.mul(precioKg);
          const costoTotal = kilos.mul(costoHistorico);
          const margen = total.sub(costoTotal);
          const margenPct = total.gt(0) ? margen.div(total) : new Prisma.Decimal(0);

          const venta = await tx.venta.create({
            data: {
              fecha: v.fecha,
              clienteId,
              variedadId,
              calibreId,
              kilos,
              precioKg,
              total,
              costoTotal,
              margen,
              margenPct,
              formaPago: normalizarCondicionPago(
                v.formaPago,
                v.estadoPago ? normalizarEstadoPago(v.estadoPago) : undefined
              ),
              estadoPago: v.estadoPago ? normalizarEstadoPago(v.estadoPago) : "pagado",
              tipoDocumento: v.tipoDocumento ? normalizarTipoDocumento(v.tipoDocumento) : "sin_documento",
              nDocumento: v.nDocumento,
              observaciones: v.observaciones,
            },
          });

          const clave = `${v.variedad}::${v.calibre}`;
          const lotesDisponibles = (lotesPorVariedadCalibre.get(clave) ?? []).filter((l) =>
            l.kilosDisponibles.gt(0)
          );
          const { consumos, kilosFaltantes } = calcularConsumoFIFO(lotesDisponibles, kilos);

          if (kilosFaltantes.gt(0)) {
            avisos.push(
              `Venta ${v.cliente} ${v.fecha.toISOString().slice(0, 10)}: no hay lotes suficientes ` +
                `para reconciliar stock (faltan ${kilosFaltantes.toString()} kg de ${clave}) — ` +
                `revisar manualmente contra la hoja Inventario del Excel`
            );
          }

          for (const consumo of consumos) {
            await tx.ventaLote.create({
              data: {
                ventaId: venta.id,
                loteId: consumo.loteId,
                kilosConsumidos: consumo.kilosConsumidos,
                // Histórico, no el costo real del lote (ver comentario arriba).
                costoKgLote: costoHistorico,
              },
            });
            const lote = lotesDisponibles.find((l) => l.id === consumo.loteId)!;
            lote.kilosDisponibles = lote.kilosDisponibles.sub(consumo.kilosConsumidos);
            await tx.loteInventario.update({
              where: { id: consumo.loteId },
              data: {
                kilosDisponibles: { decrement: consumo.kilosConsumidos },
                estado: lote.kilosDisponibles.lte(0) ? "agotado" : undefined,
              },
            });
          }

          ventasCreadas++;
        }

        // Flujo de caja → movimientos_cobro / movimientos_pago, cruzando
        // por nombre de entidad (sección 10: "cruzar por cliente y
        // fecha/monto").
        let cobros = 0;
        let pagos = 0;
        for (const m of datos.flujoCaja) {
          const tipoNorm = m.tipo.toLowerCase();
          if (tipoNorm.includes("cobro")) {
            const clienteId = clientePorNombre.get(m.entidad);
            if (!clienteId) {
              avisos.push(`Cobro omitido: cliente "${m.entidad}" no encontrado`);
              continue;
            }
            await tx.movimientoCobro.create({
              data: {
                clienteId,
                fecha: m.fecha,
                monto: new Prisma.Decimal(Math.abs(m.monto)),
                medioPago: m.medioPago ? normalizarMedioPago(m.medioPago) : "otro",
                referencia: m.referencia,
              },
            });
            cobros++;
          } else if (tipoNorm.includes("pago")) {
            const proveedorId = proveedorPorNombre.get(m.entidad);
            if (!proveedorId) {
              avisos.push(`Pago omitido: proveedor "${m.entidad}" no encontrado`);
              continue;
            }
            await tx.movimientoPago.create({
              data: {
                proveedorId,
                fecha: m.fecha,
                monto: new Prisma.Decimal(Math.abs(m.monto)),
                medioPago: m.medioPago ? normalizarMedioPago(m.medioPago) : "otro",
                referencia: m.referencia,
              },
            });
            pagos++;
          } else {
            avisos.push(`Fila de flujo de caja no reconocida (tipo="${m.tipo}"), se omite`);
          }
        }

        let gastosCreados = 0;
        for (const g of datos.gastos) {
          await tx.gastoOperacional.create({
            data: {
              fecha: g.fecha,
              categoria: normalizarCategoriaGasto(g.categoria),
              descripcion: g.descripcion,
              pagadoA: g.pagadoA,
              monto: new Prisma.Decimal(g.monto),
              formaPago:
                g.formaPago && ["efectivo", "transferencia"].includes(g.formaPago.toLowerCase())
                  ? (g.formaPago.toLowerCase() as "efectivo" | "transferencia")
                  : "otro",
              estadoPago: g.estadoPago?.toLowerCase() === "pendiente" ? "pendiente" : "pagado",
            },
          });
          gastosCreados++;
        }

        const resumen: ResultadoCarga = {
          proveedores: proveedorPorNombre.size,
          clientes: clientePorNombre.size,
          variedades: variedadPorNombre.size,
          calibres: calibrePorClave.size,
          compras: comprasCreadas,
          ventas: ventasCreadas,
          cobros,
          pagos,
          gastos: gastosCreados,
          avisos,
        };

        if (dryRun) {
          // Fuerza rollback: --dry-run nunca debe dejar datos escritos.
          throw new DryRunRollback(resumen);
        }

        return resumen;
      },
      { timeout: 60_000 }
    );

    return resultado;
  } catch (error) {
    if (error instanceof DryRunRollback) return error.resumen;
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

class DryRunRollback extends Error {
  constructor(public resumen: ResultadoCarga) {
    super("dry-run: rollback intencional, no se guardó nada");
  }
}
