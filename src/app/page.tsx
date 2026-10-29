import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { paginaInicio } from "@/modules/usuarios/permisos";

export default async function Home() {
  const session = await getSession();
  redirect(session ? paginaInicio(session.rol) : "/login");
}
