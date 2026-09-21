import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buttonVariants } from "@/components/ui/button";
import { formatDateCL } from "@/modules/shared/dates";
import { env } from "@/lib/env";
import { listarCopiasNeon } from "@/modules/respaldo/neon";
import { BotonCopiaNeon } from "./copia-neon";

export default async function RespaldoPage() {
  const session = await getSession();
  if (session?.rol !== "admin") redirect("/dashboard");

  const ultimo = await prisma.auditLog.findFirst({
    where: { tabla: "respaldo" },
    orderBy: { createdAt: "desc" },
    include: { usuario: { select: { nombre: true } } },
  });

  const neonConfigurado = Boolean(env.NEON_API_KEY && env.NEON_PROJECT_ID);
  let copias: { name: string; created_at?: string }[] = [];
  let errorNeon: string | null = null;
  if (neonConfigurado) {
    try {
      copias = (await listarCopiasNeon({ apiKey: env.NEON_API_KEY!, projectId: env.NEON_PROJECT_ID! })).copias;
    } catch (e) {
      errorNeon = e instanceof Error ? e.message : "No se pudo consultar Neon";
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Respaldo de tus datos</h1>
        <p className="text-muted-foreground">
          Descarga una copia completa de la información del negocio en un Excel: clientes, proveedores,
          compras, ventas, cobros, pagos, gastos, fletes, inventario y auditoría. No incluye contraseñas.
        </p>
      </div>

      <a href="/api/v1/respaldo" className={buttonVariants({ className: "w-fit" })}>
        Descargar respaldo completo
      </a>

      <p className="text-sm text-muted-foreground">
        {ultimo
          ? `Último respaldo descargado: ${formatDateCL(ultimo.createdAt)}${ultimo.usuario ? ` por ${ultimo.usuario.nombre}` : ""}.`
          : "Todavía no se ha descargado ningún respaldo desde la app."}
      </p>

      <div className="flex flex-col gap-2 rounded-md border p-3 text-sm">
        <p className="font-medium">Copia automática de la base de datos (Neon)</p>
        {!neonConfigurado && (
          <div className="flex flex-col gap-1 text-muted-foreground">
            <p>Todavía no está activada. Cada noche se guardaría una copia completa y se conservarían las últimas 7. Para activarla:</p>
            <ol className="ml-5 list-decimal">
              <li>En Neon, entra a tu perfil, Account settings, API keys, y crea una clave.</li>
              <li>En Vercel, Settings, Environment Variables, agrega <code>NEON_API_KEY</code> con esa clave y <code>NEON_PROJECT_ID</code> con el ID de tu proyecto (aparece en Neon, en Project settings).</li>
              <li>Redespliega en Vercel y vuelve a esta pantalla.</li>
            </ol>
          </div>
        )}
        {neonConfigurado && errorNeon && <p className="text-destructive">No se pudo consultar Neon: {errorNeon}</p>}
        {neonConfigurado && !errorNeon && (
          <>
            <p className="text-muted-foreground">
              {copias.length === 0
                ? "Activada. Todavía no hay copias: la primera se crea esta noche, o puedes crearla ahora."
                : `Activada. Copias guardadas (${copias.length}): ${copias.map((c) => c.name.replace("respaldo-", "")).join(", ")}.`}
            </p>
            <BotonCopiaNeon />
          </>
        )}
      </div>

      <div className="rounded-md border p-3 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Recomendación</p>
        <p>
          Descárgalo al cierre de cada mes y guárdalo en un lugar distinto a este computador (por ejemplo,
          tu correo o Google Drive). Así, aunque pase algo con el sistema, tienes tu información.
        </p>
      </div>
    </div>
  );
}
