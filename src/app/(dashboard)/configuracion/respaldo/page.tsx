import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buttonVariants } from "@/components/ui/button";
import { formatDateCL } from "@/modules/shared/dates";

export default async function RespaldoPage() {
  const session = await getSession();
  if (session?.rol !== "admin") redirect("/dashboard");

  const ultimo = await prisma.auditLog.findFirst({
    where: { tabla: "respaldo" },
    orderBy: { createdAt: "desc" },
    include: { usuario: { select: { nombre: true } } },
  });

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
