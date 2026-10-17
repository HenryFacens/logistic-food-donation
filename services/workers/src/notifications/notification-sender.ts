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

export interface WhatsAppCloudConfig {
  token: string;
  phoneNumberId: string;
  apiVersion: string;
  /**
   * Approved template with one body variable ({{1}}) that receives the
   * message text. Business-initiated messages outside WhatsApp's 24-hour
   * customer service window must use a template.
   */
  templateName?: string;
  templateLanguage: string;
}

/** Sends through Meta's WhatsApp Cloud API. */
export class WhatsAppCloudSender implements NotificationSender {
  constructor(private readonly config: WhatsAppCloudConfig) {}

  private payload(to: string, message: string) {
    const recipient = to.replace(/\D/g, "");
    if (!this.config.templateName) {
      return {
        messaging_product: "whatsapp",
        to: recipient,
        type: "text",
        text: { body: message, preview_url: false },
      };
    }
    return {
      messaging_product: "whatsapp",
      to: recipient,
      type: "template",
      template: {
        name: this.config.templateName,
        language: { code: this.config.templateLanguage },
        components: [
          {
            type: "body",
            // Template variables reject newlines and tabs.
            parameters: [{ type: "text", text: message.replace(/\s+/g, " ") }],
          },
        ],
      },
    };
  }

  async send(notification: Notification): Promise<void> {
    const url =
      `https://graph.facebook.com/${this.config.apiVersion}/` +
      `${this.config.phoneNumberId}/messages`;
    for (const recipient of notification.recipients) {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.config.token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(this.payload(recipient, notification.message)),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) {
        throw new Error(
          `WhatsApp Cloud API returned ${response.status}: ${await response.text()}`,
        );
      }
    }
  }
}
