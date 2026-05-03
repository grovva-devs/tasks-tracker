import { Injectable, NotFoundException } from "@nestjs/common";
import { eq, and } from "drizzle-orm";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { db } from "../../database/connection";
import { cards, lists, boards, cardComments, cardAttachments, cardAssignees, cardLabels } from "../../database/schema";
import { isCompletionList, EVENTS } from "@onboarding-tracker/shared";

@Injectable()
export class CardsService {
  constructor(private eventEmitter: EventEmitter2) {}

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

    // Emit card.created event (fire-and-forget)
    this.eventEmitter.emitAsync(EVENTS.CARD_CREATED, {
      cardId: card.id,
      cardTitle: card.title,
      boardId: card.boardId,
      listId: card.listId,
    }).catch(() => {});

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
      .select({
        id: cards.id, listId: cards.listId, boardId: cards.boardId,
        publicId: cards.publicId, cardNumber: cards.cardNumber,
        title: cards.title, description: cards.description, position: cards.position,
        dueDate: cards.dueDate, completedAt: cards.completedAt,
        deletedAt: cards.deletedAt, createdBy: cards.createdBy,
        createdAt: cards.createdAt, updatedAt: cards.updatedAt,
      })
      .from(cards)
      .where(eq(cards.id, id))
      .limit(1);
    if (!card) throw new NotFoundException("Card not found");
    return card;
  }

  async findDetail(id: string) {
    const [card] = await db
      .select({
        id: cards.id, listId: cards.listId, boardId: cards.boardId,
        publicId: cards.publicId, cardNumber: cards.cardNumber,
        title: cards.title, description: cards.description, position: cards.position,
        dueDate: cards.dueDate, completedAt: cards.completedAt,
        deletedAt: cards.deletedAt, createdBy: cards.createdBy,
        createdAt: cards.createdAt, updatedAt: cards.updatedAt,
      })
      .from(cards)
      .where(eq(cards.id, id))
      .limit(1);
    if (!card) throw new NotFoundException("Card not found");

    const comments = await db
      .select({
        id: cardComments.id, cardId: cardComments.cardId, authorId: cardComments.authorId,
        content: cardComments.content, visibility: cardComments.visibility,
        createdAt: cardComments.createdAt, updatedAt: cardComments.updatedAt,
      })
      .from(cardComments)
      .where(eq(cardComments.cardId, id))
      .orderBy(cardComments.createdAt);

    const attachments = await db
      .select({
        id: cardAttachments.id, cardId: cardAttachments.cardId,
        fileName: cardAttachments.fileName, fileUrl: cardAttachments.fileUrl,
        fileSize: cardAttachments.fileSize, mimeType: cardAttachments.mimeType,
        visibility: cardAttachments.visibility, createdAt: cardAttachments.createdAt,
      })
      .from(cardAttachments)
      .where(eq(cardAttachments.cardId, id))
      .orderBy(cardAttachments.createdAt);

    const assignees = await db
      .select({ cardId: cardAssignees.cardId, userId: cardAssignees.userId })
      .from(cardAssignees)
      .where(eq(cardAssignees.cardId, id));

    const labels = await db
      .select({ cardId: cardLabels.cardId, labelId: cardLabels.labelId })
      .from(cardLabels)
      .where(eq(cardLabels.cardId, id));

    return { ...card, comments, attachments, assignees, labels };
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
    const [card] = await db
      .select({
        id: cards.id, listId: cards.listId, boardId: cards.boardId,
        publicId: cards.publicId, cardNumber: cards.cardNumber,
        title: cards.title, description: cards.description, position: cards.position,
        dueDate: cards.dueDate, completedAt: cards.completedAt,
        createdBy: cards.createdBy, createdAt: cards.createdAt, updatedAt: cards.updatedAt,
      })
      .from(cards)
      .where(eq(cards.id, id))
      .limit(1);
    if (!card) throw new NotFoundException("Card not found");

    const [targetList] = await db
      .select({ id: lists.id, title: lists.title, boardId: lists.boardId, position: lists.position })
      .from(lists)
      .where(eq(lists.id, listId))
      .limit(1);
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

    // Emit card.completed or card.moved event
    if (completedAt && isCompletionList(targetList.title)) {
      // Fetch board publicToken for email notification
      const [board] = await db
        .select({ publicToken: boards.publicToken })
        .from(boards)
        .where(eq(boards.id, updated.boardId))
        .limit(1);

      this.eventEmitter.emitAsync(EVENTS.CARD_COMPLETED, {
        cardId: updated.id,
        cardTitle: updated.title,
        boardId: updated.boardId,
        completedBy: updated.createdBy,
        listTitle: targetList.title,
        publicToken: board?.publicToken,
      }).catch(() => {
        // Per rules/error-handle-async-errors.md — never let fire-and-forget crash
      });
    } else {
      this.eventEmitter.emitAsync(EVENTS.CARD_MOVED, {
        cardId: updated.id,
        cardTitle: updated.title,
        boardId: updated.boardId,
        listId,
        listTitle: targetList.title,
      }).catch(() => {});
    }

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