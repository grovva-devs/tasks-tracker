import { Injectable, NotFoundException } from "@nestjs/common";
import { eq, and, sql } from "drizzle-orm";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { db } from "../../database/connection";
import { lists } from "../../database/schema";
import { EVENTS } from "@onboarding-tracker/shared";

@Injectable()
export class ListsService {
  constructor(private eventEmitter: EventEmitter2) {}

  async create(boardId: string, data: { title: string; color?: string; position?: number }) {
    const [list] = await db
      .insert(lists)
      .values({
        boardId,
        title: data.title,
        color: data.color ?? null,
        position: data.position ?? 0,
      })
      .returning();

    if (!list) throw new NotFoundException("Failed to create list");

    this.eventEmitter.emitAsync(EVENTS.LIST_CREATED, {
      boardId,
      listId: list.id,
      listTitle: list.title,
    }).catch(() => {});

    return list;
  }

  async findByBoard(boardId: string) {
    return db
      .select({
        id: lists.id,
        boardId: lists.boardId,
        title: lists.title,
        position: lists.position,
        color: lists.color,
        createdAt: lists.createdAt,
        updatedAt: lists.updatedAt,
      })
      .from(lists)
      .where(and(eq(lists.boardId, boardId), sql`${lists.deletedAt} IS NULL`))
      .orderBy(lists.position);
  }

  async update(id: string, data: { title?: string; color?: string; position?: number }) {
    const [list] = await db
      .update(lists)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(lists.id, id))
      .returning();
    if (!list) throw new NotFoundException("List not found");
    return list;
  }

  async remove(id: string, userId: string) {
    await db.update(lists).set({ deletedAt: new Date(), deletedBy: userId }).where(eq(lists.id, id));
  }

  async reorder(boardId: string, items: { id: string; position: number }[]) {
    // Wrap in transaction for atomicity
    await db.transaction(async (tx) => {
      for (const item of items) {
        await tx
          .update(lists)
          .set({ position: item.position })
          .where(eq(lists.id, item.id));
      }
    });
  }
}