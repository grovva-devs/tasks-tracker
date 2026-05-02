import { Injectable } from "@nestjs/common";
import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "../../database/connection";
import { notifications } from "../../database/schema";

@Injectable()
export class NotificationsService {
  async create(data: { userId: string; type: string; title: string; message?: string; boardId?: string; cardId?: string }) {
    const [n] = await db
      .insert(notifications)
      .values({
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message ?? null,
        boardId: data.boardId ?? null,
        cardId: data.cardId ?? null,
      })
      .returning();
    return n;
  }

  async createForUsers(
    userIds: string[],
    type: string,
    title: string,
    refs: { boardId?: string; cardId?: string; message?: string } = {},
  ) {
    return db
      .insert(notifications)
      .values(
        userIds.map((userId) => ({
          userId,
          type,
          title,
          message: refs.message ?? null,
          boardId: refs.boardId ?? null,
          cardId: refs.cardId ?? null,
        })),
      )
      .returning();
  }

  async findByUser(userId: string, options?: { unreadOnly?: boolean }) {
    if (options?.unreadOnly) {
      return db
        .select({
          id: notifications.id,
          userId: notifications.userId,
          type: notifications.type,
          title: notifications.title,
          message: notifications.message,
          boardId: notifications.boardId,
          cardId: notifications.cardId,
          isRead: notifications.isRead,
          createdAt: notifications.createdAt,
        })
        .from(notifications)
        .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
        .orderBy(desc(notifications.createdAt));
    }

    return db
      .select({
        id: notifications.id,
        userId: notifications.userId,
        type: notifications.type,
        title: notifications.title,
        message: notifications.message,
        boardId: notifications.boardId,
        cardId: notifications.cardId,
        isRead: notifications.isRead,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async markAsRead(id: string) {
    const [n] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id))
      .returning();
    return n;
  }

  async markAllAsRead(userId: string) {
    return db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
      .returning();
  }

  async getUnreadCount(userId: string): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return result?.count ?? 0;
  }
}