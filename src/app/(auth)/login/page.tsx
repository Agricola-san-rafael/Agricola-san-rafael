import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { paginaInicio } from "@/modules/usuarios/permisos";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect(paginaInicio(session.rol));

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <LoginForm />
    </div>
  );
}
