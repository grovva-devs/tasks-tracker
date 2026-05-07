import { Injectable } from "@nestjs/common";
import { eq, desc, sql } from "drizzle-orm";
import { db } from "../../database/connection";
import { webhookDeliveries } from "../../database/schema";

@Injectable()
export class WebhookDeliveryService {
  async logDelivery(data: {
    webhookId: string;
    event: string;
    payload: string;
    status: string;
    httpStatus?: number;
    errorMessage?: string;
    attempt?: number;
  }) {
    const [delivery] = await db
      .insert(webhookDeliveries)
      .values({
        webhookId: data.webhookId,
        event: data.event,
        payload: data.payload,
        status: data.status,
        httpStatus: data.httpStatus ?? null,
        errorMessage: data.errorMessage ?? null,
        attempt: data.attempt ?? 1,
      })
      .returning();
    return delivery;
  }

  async findByWebhook(webhookId: string, limit = 10) {
    return db
      .select({
        id: webhookDeliveries.id,
        webhookId: webhookDeliveries.webhookId,
        event: webhookDeliveries.event,
        status: webhookDeliveries.status,
        httpStatus: webhookDeliveries.httpStatus,
        errorMessage: webhookDeliveries.errorMessage,
        attempt: webhookDeliveries.attempt,
        createdAt: webhookDeliveries.createdAt,
      })
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.webhookId, webhookId))
      .orderBy(desc(webhookDeliveries.createdAt))
      .limit(limit);
  }
}
