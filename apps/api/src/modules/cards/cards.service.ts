import { Injectable, NotFoundException } from "@nestjs/common";
import { eq, and, sql, max } from "drizzle-orm";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { db } from "../../database/connection";
import { cards, lists, boards, cardComments, cardAttachments, cardAssignees, cardLabels, users, labels as labelsTable } from "../../database/schema";
import { isCompletionList, EVENTS } from "@onboarding-tracker/shared";
import { ActivitiesService } from "../activities/activities.service";
import * as crypto from "crypto";

@Injectable()
export class CardsService {
  constructor(
    private eventEmitter: EventEmitter2,
    private activitiesService: ActivitiesService,
  ) {}

  async create(listId: string, boardId: string, data: {
    title: string;
    description?: string;
    dueDate?: string;
    createdBy?: string;
  }) {
    // Generate publicId and auto-increment cardNumber for the board
    const publicId = crypto.randomBytes(4).toString("hex");
    const [maxResult] = await db
      .select({ maxNum: max(cards.cardNumber) })
      .from(cards)
      .where(eq(cards.boardId, boardId));
    const cardNumber = (maxResult?.maxNum ?? 0) + 1;

    const [card] = await db
      .insert(cards)
      .values({
        listId,
        boardId,
        publicId,
        cardNumber,
        title: data.title,
        description: data.description ?? null,
        dueDate: data.dueDate ?? null,
      })
      .returning();

    if (!card) throw new NotFoundException("Failed to create card");

    // Emit card.created event (fire-and-forget)
    this.eventEmitter.emitAsync(EVENTS.CARD_CREATED, {
      cardId: card.id,
      cardTitle: card.title,
      boardId: card.boardId,
      listId: card.listId,
      userId: data.createdBy,
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
      .where(and(eq(cards.listId, listId), sql`${cards.deletedAt} IS NULL`))
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
      .where(and(eq(cards.id, id), sql`${cards.deletedAt} IS NULL`))
      .limit(1);
    if (!card) throw new NotFoundException("Card not found");
    return card;
  }

  async findDetail(id: string) {
    return db.transaction(async (tx) => {
      const [card] = await tx
        .select({
          id: cards.id, listId: cards.listId, boardId: cards.boardId,
          publicId: cards.publicId, cardNumber: cards.cardNumber,
          title: cards.title, description: cards.description, position: cards.position,
          dueDate: cards.dueDate, completedAt: cards.completedAt,
          deletedAt: cards.deletedAt, createdBy: cards.createdBy,
          createdAt: cards.createdAt, updatedAt: cards.updatedAt,
        })
        .from(cards)
        .where(and(eq(cards.id, id), sql`${cards.deletedAt} IS NULL`))
        .limit(1);
      if (!card) throw new NotFoundException("Card not found");

      const comments = await tx
        .select({
          id: cardComments.id, cardId: cardComments.cardId, authorId: cardComments.authorId,
          content: cardComments.content, visibility: cardComments.visibility,
          createdAt: cardComments.createdAt, updatedAt: cardComments.updatedAt,
        })
        .from(cardComments)
        .where(eq(cardComments.cardId, id))
        .orderBy(cardComments.createdAt);

      const attachments = await tx
        .select({
          id: cardAttachments.id, cardId: cardAttachments.cardId,
          fileName: cardAttachments.fileName, fileUrl: cardAttachments.fileUrl,
          fileSize: cardAttachments.fileSize, mimeType: cardAttachments.mimeType,
          visibility: cardAttachments.visibility, createdAt: cardAttachments.createdAt,
        })
        .from(cardAttachments)
        .where(eq(cardAttachments.cardId, id))
        .orderBy(cardAttachments.createdAt);

      const assignees = await tx
        .select({
          userId: cardAssignees.userId,
          displayName: users.displayName,
          email: users.email,
          avatarUrl: users.avatarUrl,
        })
        .from(cardAssignees)
        .innerJoin(users, eq(cardAssignees.userId, users.id))
        .where(eq(cardAssignees.cardId, id));

      const labelList = await tx
        .select({
          id: labelsTable.id,
          name: labelsTable.name,
          color: labelsTable.color,
        })
        .from(cardLabels)
        .innerJoin(labelsTable, eq(cardLabels.labelId, labelsTable.id))
        .where(eq(cardLabels.cardId, id));

      return { ...card, comments, attachments, assignees, labels: labelList };
    });
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

  async moveCard(id: string, listId: string, position: number, userId: string) {
    const [card] = await db
      .select({
        id: cards.id, listId: cards.listId, boardId: cards.boardId,
        publicId: cards.publicId, cardNumber: cards.cardNumber,
        title: cards.title, description: cards.description, position: cards.position,
        dueDate: cards.dueDate, completedAt: cards.completedAt,
        createdBy: cards.createdBy, createdAt: cards.createdAt, updatedAt: cards.updatedAt,
      })
      .from(cards)
      .where(and(eq(cards.id, id), sql`${cards.deletedAt} IS NULL`))
      .limit(1);
    if (!card) throw new NotFoundException("Card not found");

    const [targetList] = await db
      .select({ id: lists.id, title: lists.title, boardId: lists.boardId, position: lists.position })
      .from(lists)
      .where(and(eq(lists.id, listId), sql`${lists.deletedAt} IS NULL`))
      .limit(1);
    if (!targetList) throw new NotFoundException("Target list not found");

    let completedAt: Date | null = card.completedAt;
    const wasCompleted = !!card.completedAt;

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

    if (!updated) throw new NotFoundException("Card not found after update");

    // Emit card.completed or card.moved event
    if (completedAt && isCompletionList(targetList.title)) {
      const [board] = await db
        .select({ publicToken: boards.publicToken })
        .from(boards)
        .where(and(eq(boards.id, updated.boardId), sql`${boards.deletedAt} IS NULL`))
        .limit(1);

      this.eventEmitter.emitAsync(EVENTS.CARD_COMPLETED, {
        cardId: updated.id,
        cardTitle: updated.title,
        boardId: updated.boardId,
        completedBy: userId,
        listTitle: targetList.title,
        publicToken: board?.publicToken,
      }).catch(() => {});

      // Check if all cards on this board are completed
      await this.checkBoardCompletion(updated.boardId, userId);
    } else {
      this.eventEmitter.emitAsync(EVENTS.CARD_MOVED, {
        cardId: updated.id,
        cardTitle: updated.title,
        boardId: updated.boardId,
        listId,
        listTitle: targetList.title,
        userId,
      }).catch(() => {});

      // If card was completed and moved out of Done, check if board should revert to active
      if (wasCompleted && !completedAt) {
        await this.revertBoardIfActive(updated.boardId, userId);
      }
    }

    return updated;
  }

  private async checkBoardCompletion(boardId: string, userId: string) {
    const totalResult = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(cards)
      .where(and(eq(cards.boardId, boardId), sql`${cards.deletedAt} IS NULL`));
    const total = totalResult[0]?.total ?? 0;
    if (total === 0) return;

    const completedResult = await db
      .select({ completed: sql<number>`count(*)::int` })
      .from(cards)
      .where(and(eq(cards.boardId, boardId), sql`${cards.completedAt} IS NOT NULL`, sql`${cards.deletedAt} IS NULL`));
    const completed = completedResult[0]?.completed ?? 0;

    if (total > 0 && total === completed) {
      await db
        .update(boards)
        .set({ status: "completed", updatedAt: new Date() })
        .where(eq(boards.id, boardId));

      this.eventEmitter.emitAsync(EVENTS.BOARD_COMPLETED, {
        boardId,
        userId,
      }).catch(() => {});
    }
  }

  private async revertBoardIfActive(boardId: string, userId: string) {
    const [board] = await db
      .select({ id: boards.id, status: boards.status })
      .from(boards)
      .where(and(eq(boards.id, boardId), sql`${boards.deletedAt} IS NULL`))
      .limit(1);

    if (board?.status === "completed") {
      await db
        .update(boards)
        .set({ status: "active", updatedAt: new Date() })
        .where(eq(boards.id, boardId));
    }
  }

  async remove(id: string, userId: string) {
    await db.update(cards).set({ deletedAt: new Date(), deletedBy: userId }).where(eq(cards.id, id));
  }

  async reorder(listId: string, items: { id: string; position: number }[]) {
    // Wrap in transaction for atomicity
    await db.transaction(async (tx) => {
      for (const item of items) {
        await tx
          .update(cards)
          .set({ position: item.position })
          .where(and(eq(cards.id, item.id), eq(cards.listId, listId)));
      }
    });
  }

  async addAssignee(cardId: string, userId: string) {
    const [assignee] = await db
      .insert(cardAssignees)
      .values({ cardId, userId })
      .onConflictDoNothing()
      .returning();

    if (assignee) {
      this.eventEmitter.emitAsync(EVENTS.CARD_ASSIGNED, {
        cardId,
        userId,
      }).catch(() => {});
    }

    return assignee;
  }

  async removeAssignee(cardId: string, userId: string) {
    await db
      .delete(cardAssignees)
      .where(and(eq(cardAssignees.cardId, cardId), eq(cardAssignees.userId, userId)));
  }
}