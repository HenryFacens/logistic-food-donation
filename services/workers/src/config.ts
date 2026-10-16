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
  };
}
