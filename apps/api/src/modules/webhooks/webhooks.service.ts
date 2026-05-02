import { Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { db } from "../../database/connection";
import { webhooks } from "../../database/schema";
import * as crypto from "crypto";

@Injectable()
export class WebhooksService {
  async create(data: { url: string; events: string[]; createdBy: string }) {
    const [webhook] = await db
      .insert(webhooks)
      .values({
        url: data.url,
        secret: crypto.randomBytes(32).toString("hex"),
        events: data.events,
        createdBy: data.createdBy,
      })
      .returning();
    return webhook;
  }

  async findAll() {
    return db
      .select({
        id: webhooks.id,
        url: webhooks.url,
        secret: webhooks.secret,
        events: webhooks.events,
        isActive: webhooks.isActive,
        createdBy: webhooks.createdBy,
        createdAt: webhooks.createdAt,
      })
      .from(webhooks);
  }

  async findOne(id: string) {
    const [webhook] = await db
      .select({
        id: webhooks.id,
        url: webhooks.url,
        secret: webhooks.secret,
        events: webhooks.events,
        isActive: webhooks.isActive,
        createdBy: webhooks.createdBy,
        createdAt: webhooks.createdAt,
      })
      .from(webhooks)
      .where(eq(webhooks.id, id))
      .limit(1);
    return webhook;
  }

  async toggleActive(id: string, isActive: boolean) {
    const [webhook] = await db
      .update(webhooks)
      .set({ isActive })
      .where(eq(webhooks.id, id))
      .returning();
    return webhook;
  }

  async update(id: string, data: { url?: string; events?: string[] }) {
    const [webhook] = await db
      .update(webhooks)
      .set(data)
      .where(eq(webhooks.id, id))
      .returning();
    return webhook;
  }

  async remove(id: string) {
    await db.delete(webhooks).where(eq(webhooks.id, id));
  }

  async findActive() {
    return db
      .select({
        id: webhooks.id,
        url: webhooks.url,
        secret: webhooks.secret,
        events: webhooks.events,
        isActive: webhooks.isActive,
      })
      .from(webhooks)
      .where(eq(webhooks.isActive, true));
  }
}