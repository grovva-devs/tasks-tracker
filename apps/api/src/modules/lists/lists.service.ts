import { Injectable, NotFoundException } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { db } from "../../database/connection";
import { lists } from "../../database/schema";

@Injectable()
export class ListsService {
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
      .where(eq(lists.boardId, boardId))
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

  async remove(id: string) {
    await db.delete(lists).where(eq(lists.id, id));
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