export const WEBHOOK_SENDER = Symbol("WEBHOOK_SENDER");

export interface IWebhookSender {
  send(url: string, secret: string, payload: object): Promise<boolean>;
  sendWithRetry(url: string, secret: string, payload: object, maxRetries?: number): Promise<boolean>;
  deliverToActiveWebhooks(
    activeWebhooks: { id: string; url: string; secret: string; events: string[]; isActive: boolean }[],
    event: string,
    payload: object,
  ): Promise<{ delivered: number; failed: number; errors: string[] }>;
}