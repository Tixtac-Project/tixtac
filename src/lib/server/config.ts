import { z } from "zod";

const envSchema = z.object({
  JWT_SECRET: z.string().min(1),
  NODE_ENV: z.enum(["development", "production", "test"]),
});

envSchema.parse(process.env);
