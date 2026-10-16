declare const process: {
  env: Record<string, string | undefined>;
};

declare const console: {
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
};

declare function setTimeout(
  callback: (...args: unknown[]) => void,
  milliseconds: number,
): unknown;

declare function fetch(
  input: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  },
): Promise<{
  ok: boolean;
  status: number;
  text(): Promise<string>;
}>;

declare module "node:assert/strict" {
  const assert: {
    equal(actual: unknown, expected: unknown, message?: string): void;
    deepEqual(actual: unknown, expected: unknown, message?: string): void;
    ok(value: unknown, message?: string): asserts value;
    rejects(
      block: () => Promise<unknown>,
      expected?: RegExp | ((error: unknown) => boolean),
    ): Promise<void>;
  };
  export default assert;
}

declare module "node:test" {
  export default function test(
    name: string,
    callback: () => void | Promise<void>,
  ): void;
}

declare module "pg" {
  export interface QueryResultRow {
    [column: string]: unknown;
  }

  export interface QueryResult<Row extends QueryResultRow = QueryResultRow> {
    rows: Row[];
    rowCount: number | null;
  }

  export interface PoolClient {
    query<Row extends QueryResultRow = QueryResultRow>(
      text: string,
      values?: readonly unknown[],
    ): Promise<QueryResult<Row>>;
    release(): void;
  }

  export class Pool {
    constructor(config: {
      connectionString: string;
      max?: number;
      idleTimeoutMillis?: number;
    });
    query<Row extends QueryResultRow = QueryResultRow>(
      text: string,
      values?: readonly unknown[],
    ): Promise<QueryResult<Row>>;
    connect(): Promise<PoolClient>;
    end(): Promise<void>;
  }
}

declare module "@azure/functions" {
  export interface InvocationContext {
    invocationId: string;
    log(...args: unknown[]): void;
    error(...args: unknown[]): void;
  }

  export interface Timer {
    isPastDue: boolean;
  }

  export const app: {
    timer(
      name: string,
      options: {
        schedule: string;
        runOnStartup?: boolean;
        handler: (timer: Timer, context: InvocationContext) => Promise<void>;
      },
    ): void;
  };
}

declare module "@azure/service-bus" {
  export interface ServiceBusReceivedMessage {
    body: unknown;
    deliveryCount?: number;
  }

  export interface ServiceBusReceiver {
    receiveMessages(
      maxMessageCount: number,
      options?: { maxWaitTimeInMs?: number },
    ): Promise<ServiceBusReceivedMessage[]>;
    completeMessage(message: ServiceBusReceivedMessage): Promise<void>;
    abandonMessage(message: ServiceBusReceivedMessage): Promise<void>;
    deadLetterMessage(
      message: ServiceBusReceivedMessage,
      options?: { deadLetterReason?: string; deadLetterErrorDescription?: string },
    ): Promise<void>;
    close(): Promise<void>;
  }

  export interface ServiceBusSender {
    sendMessages(message: {
      body: unknown;
      messageId: string;
      correlationId: string;
      contentType: string;
      applicationProperties: Record<string, unknown>;
    }): Promise<void>;
    close(): Promise<void>;
  }

  export class ServiceBusClient {
    constructor(connectionString: string);
    createSender(queueName: string): ServiceBusSender;
    createReceiver(
      queueName: string,
      options?: { receiveMode?: "peekLock" | "receiveAndDelete" },
    ): ServiceBusReceiver;
    close(): Promise<void>;
  }
}
