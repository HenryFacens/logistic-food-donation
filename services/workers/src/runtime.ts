import type { MessageEnvelope, QueueName } from "@resgata/shared";
import type { WorkersConfig } from "./config.js";
import {
  handleOfferNotification,
} from "./handlers/acs-notification.js";
import { handleClassification } from "./handlers/classification.js";
import { handleMatching } from "./handlers/matching.js";
import { handleOfferTimeout } from "./handlers/offer-timeout.js";
import {
  handlePickupNotification,
} from "./handlers/pickup-notification.js";
import {
  PostgresDatabase,
  type Database,
  type SqlExecutor,
} from "./infrastructure/database.js";
import {
  ConsumerRunner,
  type MessageHandler,
} from "./messaging/consumer-runner.js";
import { IdempotentConsumer } from "./messaging/idempotent-consumer.js";
import type { MessageBus } from "./messaging/message-bus.js";
import { MessageStore } from "./messaging/message-store.js";
import { OutboxRelay } from "./messaging/outbox-relay.js";
import { PostgresMessageBus } from "./messaging/pg-message-bus.js";
import {
  ServiceBusMessageBus,
} from "./messaging/servicebus-message-bus.js";
import {
  AcsNotificationSender,
  WhatsAppCloudSender,
  type NotificationSender,
} from "./notifications/notification-sender.js";
import {
  ClaudeNeedMatcher,
  FallbackNeedMatcher,
} from "./matching/need-matcher.js";
import {
  NoRoutingProvider,
  OsrmRoutingProvider,
  type RouteEtaProvider,
} from "./routing/route-eta.js";
import {
  NotificationDispatcher,
} from "./notifications/notification-dispatcher.js";
import {
  PostgresScheduler,
  type Scheduler,
} from "./scheduling/scheduler.js";

const QUEUES: readonly QueueName[] = [
  "donation.created",
  "donation.classified",
  "offer.sent",
  "offer.timeout",
  "pickup.confirmed",
];

function transactionalHandler(
  database: Database,
  name: string,
  handler: (
    message: MessageEnvelope,
    transaction: SqlExecutor,
  ) => Promise<void>,
): MessageHandler {
  return new IdempotentConsumer(database, name, handler);
}

export class WorkersRuntime {
  readonly database: Database;
  readonly scheduler: Scheduler;
  readonly bus: MessageBus;
  readonly relay: OutboxRelay;
  readonly consumers: ConsumerRunner;
  readonly notifications: NotificationDispatcher;

  private constructor(
    private readonly config: WorkersConfig,
    database: Database,
    scheduler: Scheduler,
    bus: MessageBus,
    relay: OutboxRelay,
    consumers: ConsumerRunner,
    notifications: NotificationDispatcher,
  ) {
    this.database = database;
    this.scheduler = scheduler;
    this.bus = bus;
    this.relay = relay;
    this.consumers = consumers;
    this.notifications = notifications;
  }

  static create(config: WorkersConfig): WorkersRuntime {
    const database = new PostgresDatabase(config.databaseUrl);
    const scheduler = new PostgresScheduler(database);
    const store = new MessageStore(database);
    const bus: MessageBus =
      config.queueDriver === "pg"
        ? new PostgresMessageBus(database, config.workerId)
        : new ServiceBusMessageBus(
            config.serviceBusConnectionString!,
            scheduler,
            store,
          );
    const notificationSender: NotificationSender = config.whatsapp
      ? new WhatsAppCloudSender(config.whatsapp)
      : new AcsNotificationSender(config.acsSender, config.acsMockUrl);
    const needMatcher = new FallbackNeedMatcher(
      config.anthropicApiKey
        ? new ClaudeNeedMatcher({
            apiKey: config.anthropicApiKey,
            model: config.matchingModel,
          })
        : undefined,
    );
    const routing: RouteEtaProvider = config.osrmUrl
      ? new OsrmRoutingProvider(config.osrmUrl)
      : new NoRoutingProvider();
    const handlers = new Map<QueueName, MessageHandler>([
      [
        "donation.created",
        transactionalHandler(
          database,
          "classification",
          handleClassification,
        ),
      ],
      [
        "donation.classified",
        transactionalHandler(database, "matching", (message, transaction) =>
          handleMatching(
            message,
            transaction,
            config.offerTimeoutSeconds,
            routing,
            needMatcher,
          ),
        ),
      ],
      [
        "offer.sent",
        transactionalHandler(
          database,
          "acs-offer-notification",
          handleOfferNotification,
        ),
      ],
      [
        "offer.timeout",
        transactionalHandler(
          database,
          "sequential-offer-timeout",
          (message, transaction) =>
            handleOfferTimeout(
              message,
              transaction,
              config.offerTimeoutSeconds,
            ),
        ),
      ],
      [
        "pickup.confirmed",
        transactionalHandler(
          database,
          "pickup-notification",
          handlePickupNotification,
        ),
      ],
    ]);
    const relay = new OutboxRelay(
      bus,
      store,
      config.workerId,
      config.maxDeliveryAttempts,
    );
    const consumers = new ConsumerRunner(
      bus,
      handlers,
      config.maxDeliveryAttempts,
    );
    const notifications = new NotificationDispatcher(
      database,
      notificationSender,
      config.maxDeliveryAttempts,
    );
    return new WorkersRuntime(
      config,
      database,
      scheduler,
      bus,
      relay,
      consumers,
      notifications,
    );
  }

  runOutbox(): Promise<number> {
    return this.relay.run(this.config.workerBatchSize);
  }

  releaseScheduled(): Promise<number> {
    return this.scheduler.releaseDue(
      this.bus,
      this.config.workerBatchSize,
    );
  }

  async runConsumers(): Promise<number> {
    let completed = 0;
    for (const queue of QUEUES) {
      completed += await this.consumers.run(
        queue,
        this.config.workerBatchSize,
      );
    }
    return completed;
  }

  runNotifications(): Promise<number> {
    return this.notifications.run(this.config.workerBatchSize);
  }

  async close(): Promise<void> {
    await this.bus.close();
    await this.database.close();
  }
}
