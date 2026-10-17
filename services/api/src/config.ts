import { z } from "zod";

const environmentSchema = z.object({
  DATABASE_URL: z.string().min(1),
  QUEUE_DRIVER: z.enum(["servicebus", "pg"]).default("servicebus"),
  SERVICE_BUS_CONNECTION_STRING: z.string().optional(),
  OPENAI_BASE_URL: z.url().default("http://mock-openai:3000"),
  VISION_API_URL: z.url().optional(),
  VISION_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
  ANTHROPIC_API_KEY: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined),
  ANTHROPIC_MODEL: z.string().trim().min(1).default("claude-sonnet-5-5"),
  ENABLE_DEMO_LOGIN: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  ENABLE_DEV_LOGIN_CODES: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30),
  AzureWebJobsStorage: z.string().optional(),
  PHOTO_CONTAINER: z.string().default("photos"),
  GEO_PROVIDER: z.enum(["auto", "simulated"]).default("auto"),
  NOMINATIM_URL: z.url().default("https://nominatim.openstreetmap.org"),
  VIACEP_URL: z.url().default("https://viacep.com.br/ws"),
  GEO_USER_AGENT: z
    .string()
    .default("Resgata/0.1 (food donation logistics; contact: dev@resgata.local)"),
  CLAUDE_TIMEOUT_MS: z.coerce.number().int().positive().default(25000),
  ENABLE_DEV_RESET: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  API_VERSION: z.string().default("0.1.0"),
});

export type ApiConfig = z.infer<typeof environmentSchema>;

let cachedConfig: ApiConfig | undefined;

export function getConfig(): ApiConfig {
  cachedConfig ??= environmentSchema.parse(process.env);
  return cachedConfig;
}

export function resetConfigForTests(): void {
  cachedConfig = undefined;
}
