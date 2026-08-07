import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("30d"),
  CRON_SECRET: z.string().min(1),
  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  STORAGE_LOCAL_PATH: z.string().default("./storage/uploads"),
  ALERTA_DIAS_ANTICIPACION: z.coerce.number().default(2),
  ALERTA_DIAS_GASTO_PENDIENTE: z.coerce.number().default(5),
});

export const env = envSchema.parse(process.env);
