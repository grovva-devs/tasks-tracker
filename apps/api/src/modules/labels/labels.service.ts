import { Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { db } from "../../database/connection";
import { labels, cardLabels } from "../../database/schema";

@Injectable()
export class LabelsService {
  async create(boardId: string, data: { name: string; color: string }) {
    const [label] = await db
      .insert(labels)
      .values({ boardId, ...data })
      .returning();
    return label;
  }

  async findByBoard(boardId: string) {
    return db
      .select()
      .from(labels)
      .where(eq(labels.boardId, boardId));
  }

  async remove(id: string) {
    await db.delete(labels).where(eq(labels.id, id));
  }

  async addCardLabel(cardId: string, labelId: string) {
    await db.insert(cardLabels).values({ cardId, labelId }).onConflictDoNothing();
  }

  async removeCardLabel(cardId: string, labelId: string) {
    await db
      .delete(cardLabels)
      .where(eq(cardLabels.cardId, cardId));
  }
}