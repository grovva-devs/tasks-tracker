import { Injectable, NotFoundException } from "@nestjs/common";
import { eq, and } from "drizzle-orm";
import { db } from "../../database/connection";
import { cards, lists, cardComments, cardAttachments, cardAssignees, cardLabels } from "../../database/schema";
import { isCompletionList } from "@onboarding-tracker/shared";

@Injectable()
export class CardsService {
  async create(listId: string, boardId: string, data: { title: string; description?: string; dueDate?: string }) {
    const [card] = await db
      .insert(cards)
      .values({
        listId,
        boardId,
        title: data.title,
        description: data.description ?? null,
        dueDate: data.dueDate ?? null,
      })
      .returning();
    return card;
  }

  async findByList(listId: string) {
    return db
      .select({
        id: cards.id,
        listId: cards.listId,
        boardId: cards.boardId,
        title: cards.title,
        description: cards.description,
        position: cards.position,
        dueDate: cards.dueDate,
        completedAt: cards.completedAt,
        createdAt: cards.createdAt,
        updatedAt: cards.updatedAt,
      })
      .from(cards)
      .where(eq(cards.listId, listId))
      .orderBy(cards.position);
  }

  async findOne(id: string) {
    const [card] = await db
      .select()
      .from(cards)
      .where(eq(cards.id, id))
      .limit(1);
    if (!card) throw new NotFoundException("Card not found");
    return card;
  }

  async findDetail(id: string) {
    const [card] = await db
      .select()
      .from(cards)
      .where(eq(cards.id, id))
      .limit(1);
    if (!card) throw new NotFoundException("Card not found");

    const comments = await db
      .select()
      .from(cardComments)
      .where(eq(cardComments.cardId, id))
      .orderBy(cardComments.createdAt);

    const attachments = await db
      .select()
      .from(cardAttachments)
      .where(eq(cardAttachments.cardId, id))
      .orderBy(cardAttachments.createdAt);

    const assignees = await db
      .select()
      .from(cardAssignees)
      .where(eq(cardAssignees.cardId, id));

    const labels = await db
      .select()
      .from(cardLabels)
      .where(eq(cardLabels.cardId, id));

    return {
      ...card,
      comments,
      attachments,
      assignees,
      labels,
    };
  }

  async update(id: string, data: { title?: string; description?: string; dueDate?: string | null }) {
    const [card] = await db
      .update(cards)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(cards.id, id))
      .returning();
    if (!card) throw new NotFoundException("Card not found");
    return card;
  }

  async moveCard(id: string, listId: string, position: number) {
    const [card] = await db.select().from(cards).where(eq(cards.id, id)).limit(1);
    if (!card) throw new NotFoundException("Card not found");

    const [targetList] = await db.select().from(lists).where(eq(lists.id, listId)).limit(1);
    if (!targetList) throw new NotFoundException("Target list not found");

    let completedAt: Date | null = card.completedAt;

    if (isCompletionList(targetList.title)) {
      completedAt = new Date();
    } else if (card.completedAt) {
      completedAt = null;
    }

    const [updated] = await db
      .update(cards)
      .set({ listId, position, completedAt, updatedAt: new Date() })
      .where(eq(cards.id, id))
      .returning();

    return updated;
  }

  async remove(id: string) {
    await db.delete(cards).where(eq(cards.id, id));
  }

  async reorder(listId: string, items: { id: string; position: number }[]) {
    for (const item of items) {
      await db
        .update(cards)
        .set({ position: item.position })
        .where(and(eq(cards.id, item.id), eq(cards.listId, listId)));
    }
  }
}