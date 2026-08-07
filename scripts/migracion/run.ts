import "dotenv/config";
import { leerExcel } from "./01-leer-excel";
import { transformarDatos } from "./02-transformar";
import { cargarDatos } from "./03-cargar";
import { validarMigracion } from "./04-validar";

function parsearArgs() {
  const args = process.argv.slice(2);
  const archivo = args.find((a) => a.startsWith("--archivo="))?.split("=")[1];
  const referencia = args.find((a) => a.startsWith("--referencia="))?.split("=")[1];
  const commit = args.includes("--commit");
  const dryRun = args.includes("--dry-run") || !commit;
  return { archivo, referencia, dryRun };
}

async function main() {
  const { archivo, referencia, dryRun } = parsearArgs();

  if (!archivo) {
    console.error(
      "Uso: tsx scripts/migracion/run.ts --archivo=<ruta.xlsx> [--dry-run|--commit] [--referencia=<ruta.json>]"
    );
    process.exit(1);
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL no está definido");

  console.log(`Leyendo ${archivo}...`);
  const hojas = await leerExcel(archivo);
  console.log(
    `Filas leídas — proveedores: ${hojas.proveedores.length}, clientes: ${hojas.clientes.length}, ` +
      `compras: ${hojas.compras.length}, ventas: ${hojas.ventas.length}, ` +
      `flujo de caja: ${hojas.flujoCaja.length}, gastos: ${hojas.gastos.length}`
  );

  const datos = transformarDatos(hojas);

  console.log(`\nModo: ${dryRun ? "DRY-RUN (no se escribe nada)" : "COMMIT (se escribe en la base)"}`);
  const resultado = await cargarDatos(datos, databaseUrl, { dryRun });

  console.log("\nResumen de carga:");
  console.log(`  Proveedores: ${resultado.proveedores}`);
  console.log(`  Clientes: ${resultado.clientes}`);
  console.log(`  Variedades: ${resultado.variedades}`);
  console.log(`  Calibres: ${resultado.calibres}`);
  console.log(`  Compras: ${resultado.compras}`);
  console.log(`  Ventas: ${resultado.ventas}`);
  console.log(`  Cobros: ${resultado.cobros}`);
  console.log(`  Pagos: ${resultado.pagos}`);
  console.log(`  Gastos: ${resultado.gastos}`);

  if (resultado.avisos.length > 0) {
    console.log(`\nAvisos (${resultado.avisos.length}):`);
    for (const aviso of resultado.avisos) console.log(`  - ${aviso}`);
  }

  if (dryRun) {
    console.log("\nDry-run completo. Nada se escribió en la base de datos.");
    console.log("Revisa el resumen y los avisos, y corre de nuevo con --commit cuando esté listo.");
    return;
  }

  console.log("\nCarga confirmada y escrita en la base de datos.");

  if (referencia) {
    console.log(`\nValidando contra ${referencia}...`);
    const validacion = await validarMigracion(databaseUrl, referencia);
    if (validacion.exitoso) {
      console.log(`✔ Los ${validacion.totalComparados} saldos comparados coinciden.`);
    } else {
      console.log(`✘ ${validacion.discrepancias.length} discrepancias encontradas:`);
      for (const d of validacion.discrepancias) console.log(`  - ${d}`);
      process.exitCode = 1;
    }
  } else {
    console.log(
      "\nNo se pasó --referencia=<ruta.json> — corre scripts/migracion/04-validar.ts manualmente " +
        "contra los saldos de la hoja Resumen antes de dar la migración por buena."
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
