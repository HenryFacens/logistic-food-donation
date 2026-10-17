export type QueueDriver = "servicebus" | "pg";

export interface WorkersConfig {
  databaseUrl: string;
  queueDriver: QueueDriver;
  serviceBusConnectionString?: string;
  offerTimeoutSeconds: number;
  maxDeliveryAttempts: number;
  workerBatchSize: number;
  workerId: string;
  acsSender?: string;
  acsMockUrl?: string;
  notificationProvider: "acs-mock" | "whatsapp";
  whatsapp?: {
    token: string;
    phoneNumberId: string;
    apiVersion: string;
    templateName?: string;
    templateLanguage: string;
  };
  /** OSRM base URL for road ETAs; undefined uses straight-line estimates. */
  osrmUrl?: string;
  /** Azure Maps key: preferred source of road ETAs (OSRM becomes the fallback). */
  azureMapsKey?: string;
  /** Claude item-level request matching; rules only when the key is absent. */
  anthropicApiKey?: string;
  matchingModel: string;
}

function positiveInteger(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

export function loadConfig(): WorkersConfig {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const queueDriver = process.env.QUEUE_DRIVER ?? "servicebus";
  if (queueDriver !== "servicebus" && queueDriver !== "pg") {
    throw new Error("QUEUE_DRIVER must be servicebus or pg");
  }

  const serviceBusConnectionString =
    process.env.SERVICE_BUS_CONNECTION_STRING;
  if (queueDriver === "servicebus" && !serviceBusConnectionString) {
    throw new Error(
      "SERVICE_BUS_CONNECTION_STRING is required for servicebus mode",
    );
  }

  const notificationProvider =
    process.env.NOTIFICATION_PROVIDER === "whatsapp" ? "whatsapp" : "acs-mock";
  let whatsapp: WorkersConfig["whatsapp"];
  if (notificationProvider === "whatsapp") {
    const token = process.env.WHATSAPP_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!token || !phoneNumberId) {
      throw new Error(
        "WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID are required when NOTIFICATION_PROVIDER=whatsapp",
      );
    }
    whatsapp = {
      token,
      phoneNumberId,
      apiVersion: process.env.WHATSAPP_API_VERSION || "v21.0",
      templateName: process.env.WHATSAPP_TEMPLATE_NAME || undefined,
      templateLanguage: process.env.WHATSAPP_TEMPLATE_LANGUAGE || "pt_BR",
    };
  }

  return {
    databaseUrl,
    queueDriver,
    serviceBusConnectionString,
    offerTimeoutSeconds: positiveInteger("OFFER_TIMEOUT_SECONDS", 30),
    maxDeliveryAttempts: positiveInteger("MAX_DELIVERY_ATTEMPTS", 5),
    workerBatchSize: positiveInteger("WORKER_BATCH_SIZE", 10),
    workerId:
      process.env.WORKER_ID ??
      `workers-${process.env.WEBSITE_INSTANCE_ID ?? "local"}`,
    acsSender: process.env.ACS_SENDER,
    acsMockUrl: process.env.ACS_MOCK_URL,
    notificationProvider,
    whatsapp,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY?.trim() || undefined,
    azureMapsKey: process.env.AZURE_MAPS_KEY?.trim() || undefined,
    matchingModel:
      process.env.MATCHING_MODEL?.trim() ||
      process.env.ANTHROPIC_MODEL?.trim() ||
      "claude-sonnet-5-5",
    osrmUrl:
      process.env.ROUTING_PROVIDER === "none"
        ? undefined
        : process.env.OSRM_URL || "https://router.project-osrm.org",
  };
}
