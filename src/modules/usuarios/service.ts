import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { ConflictError, NotFoundError } from "@/modules/shared/errors";
import type { UsuarioInput, UsuarioUpdateInput } from "./schema";

const CAMPOS_PUBLICOS = {
  id: true,
  nombre: true,
  email: true,
  telefono: true,
  rol: true,
  activo: true,
  createdAt: true,
} as const;

export async function listarUsuarios() {
  return prisma.usuario.findMany({
    select: CAMPOS_PUBLICOS,
    orderBy: { nombre: "asc" },
  });
}

export async function crearUsuario(input: UsuarioInput) {
  const existente = await prisma.usuario.findUnique({ where: { email: input.email } });
  if (existente) throw new ConflictError("Ya existe un usuario con ese email");

  const passwordHash = await hashPassword(input.password);
  return prisma.usuario.create({
    data: {
      nombre: input.nombre,
      email: input.email,
      telefono: input.telefono,
      rol: input.rol,
      passwordHash,
    },
    select: CAMPOS_PUBLICOS,
  });
}

export async function actualizarUsuario(id: string, input: UsuarioUpdateInput) {
  const usuario = await prisma.usuario.findUnique({ where: { id } });
  if (!usuario) throw new NotFoundError("Usuario no encontrado");

  return prisma.usuario.update({
    where: { id },
    data: {
      nombre: input.nombre,
      telefono: input.telefono,
      rol: input.rol,
      activo: input.activo,
    },
    select: CAMPOS_PUBLICOS,
  });
}

export async function resetearPassword(id: string, nuevaPassword: string) {
  const usuario = await prisma.usuario.findUnique({ where: { id } });
  if (!usuario) throw new NotFoundError("Usuario no encontrado");

  const passwordHash = await hashPassword(nuevaPassword);
  await prisma.usuario.update({ where: { id }, data: { passwordHash } });
}
