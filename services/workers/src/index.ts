import { app, type InvocationContext, type Timer } from "@azure/functions";
import { loadConfig } from "./config.js";
import { WorkersRuntime } from "./runtime.js";

let runtime: WorkersRuntime | undefined;
let outboxRunning = false;
let schedulerRunning = false;
let consumersRunning = false;
let notificationsRunning = false;

function getRuntime(): WorkersRuntime {
  runtime ??= WorkersRuntime.create(loadConfig());
  return runtime;
}

async function guarded(
  context: InvocationContext,
  state: "outbox" | "scheduler" | "consumers" | "notifications",
  action: () => Promise<number>,
): Promise<void> {
  const isRunning =
    state === "outbox"
      ? outboxRunning
      : state === "scheduler"
        ? schedulerRunning
        : state === "consumers"
          ? consumersRunning
          : notificationsRunning;
  if (isRunning) {
    context.log(`${state} tick skipped because the previous tick is running`);
    return;
  }

  if (state === "outbox") outboxRunning = true;
  if (state === "scheduler") schedulerRunning = true;
  if (state === "consumers") consumersRunning = true;
  if (state === "notifications") notificationsRunning = true;
  try {
    const count = await action();
    if (count > 0) {
      context.log(`${state} processed ${count} message(s)`);
    }
  } catch (error) {
    context.error(`${state} tick failed`, error);
    throw error;
  } finally {
    if (state === "outbox") outboxRunning = false;
    if (state === "scheduler") schedulerRunning = false;
    if (state === "consumers") consumersRunning = false;
    if (state === "notifications") notificationsRunning = false;
  }
}

app.timer("outbox-relay", {
  schedule: "*/1 * * * * *",
  handler: async (_timer: Timer, context: InvocationContext) =>
    guarded(context, "outbox", () => getRuntime().runOutbox()),
});

app.timer("postgres-scheduler", {
  schedule: "*/1 * * * * *",
  handler: async (_timer: Timer, context: InvocationContext) =>
    guarded(context, "scheduler", () => getRuntime().releaseScheduled()),
});

app.timer("message-consumers", {
  schedule: "*/1 * * * * *",
  handler: async (_timer: Timer, context: InvocationContext) =>
    guarded(context, "consumers", () => getRuntime().runConsumers()),
});

app.timer("acs-notifications", {
  schedule: "*/1 * * * * *",
  handler: async (_timer: Timer, context: InvocationContext) =>
    guarded(context, "notifications", () =>
      getRuntime().runNotifications(),
    ),
});
