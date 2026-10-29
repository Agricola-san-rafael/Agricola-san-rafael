import nodemailer from "nodemailer";
import { env } from "./env";

export const correoConfigurado = Boolean(env.SMTP_USER && env.SMTP_PASSWORD);

export interface Correo {
  to: string;
  subject: string;
  text: string;
}

const transporte = correoConfigurado
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
    })
  : null;

/** Envía un correo de texto por SMTP. Sin SMTP_USER y SMTP_PASSWORD no hace nada y devuelve false. */
export async function enviarCorreo(correo: Correo): Promise<boolean> {
  if (!transporte) return false;
  await transporte.sendMail({ from: env.CORREO_REMITENTE, to: correo.to, subject: correo.subject, text: correo.text });
  return true;
}
