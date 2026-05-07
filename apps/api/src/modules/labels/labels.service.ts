import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { eq, and } from "drizzle-orm";
import { db } from "../../database/connection";
import { labels, cardLabels, cards } from "../../database/schema";

@Injectable()
export class LabelsService {
  async create(boardId: string, data: { name: string; color: string }) {
    const [label] = await db
      .insert(labels)
      .values({ boardId, ...data })
      .returning();
    return label;
  }

  async update(id: string, boardId: string, data: { name?: string; color?: string }) {
    const [label] = await db
      .update(labels)
      .set(data)
      .where(and(eq(labels.id, id), eq(labels.boardId, boardId)))
      .returning();
    return label;
  }

  async findByBoard(boardId: string) {
    return db
      .select({ id: labels.id, boardId: labels.boardId, name: labels.name, color: labels.color })
      .from(labels)
      .where(eq(labels.boardId, boardId));
  }

  async remove(id: string) {
    await db.delete(labels).where(eq(labels.id, id));
  }

  async addCardLabel(cardId: string, labelId: string) {
    // Verify card and label belong to the same board
    const [card] = await db.select({ boardId: cards.boardId }).from(cards).where(eq(cards.id, cardId)).limit(1);
    if (!card) throw new NotFoundException("Card not found");

    const [label] = await db.select({ boardId: labels.boardId }).from(labels).where(eq(labels.id, labelId)).limit(1);
    if (!label) throw new NotFoundException("Label not found");

    if (card.boardId !== label.boardId) {
      throw new ForbiddenException("Label does not belong to this card's board");
    }

    await db.insert(cardLabels).values({ cardId, labelId }).onConflictDoNothing();
  }

  async removeCardLabel(cardId: string, labelId: string) {
    await db
      .delete(cardLabels)
      .where(and(eq(cardLabels.cardId, cardId), eq(cardLabels.labelId, labelId)));
  }
}