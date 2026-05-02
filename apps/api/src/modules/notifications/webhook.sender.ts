import { Injectable, Logger } from "@nestjs/common";
import * as crypto from "crypto";

export interface WebhookDeliveryResult {
  delivered: number;
  failed: number;
  errors: string[];
}

@Injectable()
export class WebhookSender {
  private readonly logger = new Logger(WebhookSender.name);

  async send(url: string, secret: string, payload: object): Promise<boolean> {
    const body = JSON.stringify(payload);
    const signature = "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex");

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": signature,
      },
      body,
    });

    if (!response.ok) {
      throw new Error(`Webhook delivery failed: ${response.status}`);
    }
    return true;
  }

  async sendWithRetry(url: string, secret: string, payload: object, maxRetries = 3): Promise<boolean> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.send(url, secret, payload);
      } catch (error) {
        this.logger.warn(`Webhook attempt ${attempt}/${maxRetries} to ${url} failed: ${(error as Error).message}`);
        if (attempt === maxRetries) throw error;
        const delayMs = 100 * Math.pow(2, attempt - 1); // Exponential backoff: 100ms, 200ms, 400ms...
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
    return false;
  }

  async deliverToActiveWebhooks(
    activeWebhooks: { id: string; url: string; secret: string; events: string[]; isActive: boolean }[],
    event: string,
    payload: object,
  ): Promise<WebhookDeliveryResult> {
    const matching = activeWebhooks.filter((wh) => wh.isActive && wh.events.includes(event));
    if (matching.length === 0) return { delivered: 0, failed: 0, errors: [] };

    let delivered = 0;
    let failed = 0;
    const errors: string[] = [];

    const results = await Promise.allSettled(
      matching.map((wh) =>
        this.send(wh.url, wh.secret, { ...payload, _webhookId: wh.id, event, timestamp: new Date().toISOString() }),
      ),
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        delivered++;
      } else {
        failed++;
        errors.push(result.reason?.message ?? "Unknown error");
      }
    }

    this.logger.log(`Webhook delivery for "${event}": ${delivered} delivered, ${failed} failed`);
    return { delivered, failed, errors };
  }
}