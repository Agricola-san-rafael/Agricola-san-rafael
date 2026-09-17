import { z } from "zod";

export const usuarioSchema = z.object({
  nombre: z.string().trim().min(2, "El nombre es obligatorio"),
  email: z.string().trim().email("Email inválido"),
  telefono: z.string().optional(),
  rol: z.enum(["admin", "operador", "solo_lectura"]),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

export const usuarioUpdateSchema = z.object({
  nombre: z.string().trim().min(2, "El nombre es obligatorio").optional(),
  telefono: z.string().optional(),
  rol: z.enum(["admin", "operador", "solo_lectura"]).optional(),
  activo: z.boolean().optional(),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

export type UsuarioInput = z.infer<typeof usuarioSchema>;
export type UsuarioUpdateInput = z.infer<typeof usuarioUpdateSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
