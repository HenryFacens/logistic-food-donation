export interface Notification {
  idempotencyKey: string;
  recipients: string[];
  message: string;
}

export interface NotificationSender {
  send(notification: Notification): Promise<void>;
}

export class AcsNotificationSender implements NotificationSender {
  constructor(
    private readonly sender: string | undefined,
    private readonly mockUrl: string | undefined,
  ) {}

  async send(notification: Notification): Promise<void> {
    if (notification.recipients.length === 0) {
      return;
    }

    if (!this.mockUrl) {
      throw new Error("ACS_MOCK_URL is required in the offline local stack");
    }

    for (const recipient of notification.recipients) {
      const response = await fetch(this.mockUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": `${notification.idempotencyKey}:${recipient}`,
        },
        body: JSON.stringify({
          channel: "sms",
          from: this.sender ?? "Resgata SIMULADO",
          to: recipient,
          body: notification.message,
          simulated: true,
          simulationLabel: "SIMULADO",
        }),
      });
      if (!response.ok) {
        throw new Error(
          `ACS mock returned ${response.status}: ${await response.text()}`,
        );
      }
    }
  }
}
