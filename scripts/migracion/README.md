# Migración desde `Gestion_Agricola_San_Rafael.xlsx`

Implementa la sección 10 de la especificación técnica. **No se ha ejecutado
contra datos reales todavía** — este scaffold se construyó sin tener acceso
al Excel real; los nombres de columna que busca cada hoja son suposiciones
razonables basadas en la descripción del documento, no confirmadas contra el
archivo real.

## Antes de correr esto contra datos reales

1. **Usa una copia congelada** del Excel, nunca el archivo en uso activo.
2. Abre el archivo real y compara los encabezados de cada hoja
   (`Proveedores`, `Clientes`, `Compras`, `Ventas`, `Flujo de Caja`,
   `Gastos Operacionales`) contra los alias que busca `02-transformar.ts`
   (función `buscarColumna`, arrays de alias por campo). Si un encabezado
   real no aparece en la lista de alias, la columna se leerá como
   `undefined` — agrega el alias que falte ahí, no reescribas los mappers.
3. Corre primero con un `.xlsx` sintético pequeño (unas pocas filas de
   prueba, no datos reales) para validar que el mecanismo de lectura y
   transformación funciona antes de tocar datos de producción.

## Proceso recomendado

```bash
# 1. Dry-run: lee, transforma y "carga" en una transacción que se revierte
#    al final. No escribe nada. Revisa el resumen y los avisos.
tsx scripts/migracion/run.ts --archivo=./ruta/a/copia-congelada.xlsx --dry-run

# 2. Cuando el resumen y los avisos se vean razonables, corre en serio
#    contra una base de STAGING (nunca directo a producción):
tsx scripts/migracion/run.ts --archivo=./ruta/a/copia-congelada.xlsx --commit

# 3. Extrae a mano de la hoja "Resumen" del Excel los saldos por cliente y
#    proveedor, y guárdalos en un JSON (ver formato en 04-validar.ts):
#    { "clientes": [...], "proveedores": [...] }

# 4. Valida que los saldos calculados por las vistas coincidan —
#    este es el criterio de aceptación de la migración según el documento:
tsx scripts/migracion/run.ts --archivo=./ruta/a/copia-congelada.xlsx --commit \
  --referencia=./ruta/a/saldos-referencia.json
```

Si la validación falla, **no promuevas la migración a producción** — revisa
las discrepancias reportadas, corrige los mappers o los datos, y repite desde
el dry-run contra una base limpia.

## Qué NO se migra (deliberado, sección 10)

- La columna `I` de la hoja `Clientes` (saldo) — se recalcula desde
  `ventas`/`movimientos_cobro` migrados, nunca se copia como dato.
- Las 2 filas de ejemplo de la hoja `Prospectos`.
- Los archivos `EstadoCuenta_<Cliente>.xlsx` — dejan de ser necesarios,
  `/api/v1/clientes/:id/estado-cuenta` los reemplaza generándolos en vivo.
- La hoja `Créditos` no tiene datos que migrar hoy (está vacía); la
  estructura (`creditos_bancarios`/`cuotas_credito`) ya existe en el schema.

## Decisión de diseño: FIFO para stock, no para márgenes

Ver el comentario extenso al inicio de `03-cargar.ts`. En resumen: el motor
FIFO real (`calcularConsumoFIFO`, el mismo que usa producción) se usa
**solo** para decidir qué lote(s) migrado(s) decrementar y dejar
`kilos_disponibles` correcto — nunca para recalcular `costoTotal`/`margen`
de una venta histórica, que siempre usan el costo hardcodeado de la columna
`L` (Costo Prom. Compra) tal como pide el documento.
