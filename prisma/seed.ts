import "dotenv/config";
import argon2 from "argon2";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const VARIEDADES = ["Hass", "Edranol", "Fuerte"];

// Calibres genéricos (sin variedad asociada) según el glosario del documento
// (sección 12): tamaños numéricos + categorías de calidad.
const CALIBRES = [
  { codigo: "16", orden: 1 },
  { codigo: "18", orden: 2 },
  { codigo: "20", orden: 3 },
  { codigo: "22", orden: 4 },
  { codigo: "24", orden: 5 },
  { codigo: "28", orden: 6 },
  { codigo: "32", orden: 7 },
  { codigo: "Primera con Extra", orden: 8 },
  { codigo: "Revuelta", orden: 9 },
  { codigo: "Descarte", orden: 10 },
];

async function main() {
  for (const nombre of VARIEDADES) {
    await prisma.variedad.upsert({
      where: { nombre },
      update: {},
      create: { nombre },
    });
  }

  for (const calibre of CALIBRES) {
    const existente = await prisma.calibre.findFirst({
      where: { codigo: calibre.codigo, variedadId: null },
    });
    if (!existente) {
      await prisma.calibre.create({ data: { ...calibre, variedadId: null } });
    }
  }

  const adminEmail = "admin@agricolasanrafael.cl";
  const adminPasswordPlano = "CambiarEsta123!";
  const passwordHash = await argon2.hash(adminPasswordPlano);

  await prisma.usuario.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      nombre: "Administrador",
      email: adminEmail,
      passwordHash,
      rol: "admin",
    },
  });

  console.log("Seed completo.");
  console.log(`Usuario admin: ${adminEmail}`);
  console.log(`Password inicial: ${adminPasswordPlano} (cámbiala después del primer login)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
