import { Injectable, NotFoundException } from "@nestjs/common";
import { eq, and, ilike, sql } from "drizzle-orm";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { db } from "../../database/connection";
import { boards, lists, cards, cardComments, cardAttachments } from "../../database/schema";
import { generateSlug, EVENTS } from "@onboarding-tracker/shared";
import * as crypto from "crypto";

@Injectable()
export class BoardsService {
  constructor(private eventEmitter: EventEmitter2) {}
  async create(data: {
    title: string;
    clientName: string;
    clientEmail?: string;
    description?: string;
    createdBy: string;
    templateId?: string;
  }) {
    const slug = generateSlug(data.title) + "-" + crypto.randomBytes(2).toString("hex");
    const publicToken = crypto.randomBytes(24).toString("hex");

    const [board] = await db
      .insert(boards)
      .values({
        title: data.title,
        description: data.description ?? null,
        slug,
        publicId: crypto.randomBytes(6).toString("hex"),
        publicToken,
        clientName: data.clientName,
        clientEmail: data.clientEmail ?? null,
        createdBy: data.createdBy,
        templateId: data.templateId ?? null,
      })
      .returning();

    // Emit board.created event (fire-and-forget with .catch())
    this.eventEmitter.emitAsync(EVENTS.BOARD_CREATED, {
      boardId: board.id,
      boardTitle: board.title,
      createdBy: data.createdBy,
      teamMemberIds: [data.createdBy],
    }).catch((err: Error) => {
      // Per rules/error-handle-async-errors.md — never let fire-and-forget crash
    });

    return board;
  }

  async findAll(filters?: { status?: string; search?: string }) {
    const conditions = [];

    if (filters?.status) {
      conditions.push(eq(boards.status, filters.status));
    }
    if (filters?.search) {
      conditions.push(ilike(boards.clientName, `%${filters.search}%`));
    }

    const query = db
      .select({
        id: boards.id,
        title: boards.title,
        slug: boards.slug,
        publicId: boards.publicId,
        clientName: boards.clientName,
        status: boards.status,
        position: boards.position,
        createdAt: boards.createdAt,
        updatedAt: boards.updatedAt,
      })
      .from(boards);

    if (conditions.length > 0) {
      return query.where(and(...conditions)).orderBy(boards.createdAt);
    }

    return query.orderBy(boards.createdAt);
  }

  async findOne(id: string) {
    const [board] = await db
      .select({
        id: boards.id, title: boards.title, description: boards.description,
        slug: boards.slug, publicId: boards.publicId, publicToken: boards.publicToken,
        clientName: boards.clientName, clientEmail: boards.clientEmail,
        status: boards.status, templateId: boards.templateId,
        createdBy: boards.createdBy, position: boards.position,
        createdAt: boards.createdAt, updatedAt: boards.updatedAt,
      })
      .from(boards)
      .where(eq(boards.id, id))
      .limit(1);
    if (!board) throw new NotFoundException("Board not found");
    return board;
  }

  async findDetail(id: string) {
    const [board] = await db
      .select({
        id: boards.id, title: boards.title, description: boards.description,
        slug: boards.slug, publicId: boards.publicId, publicToken: boards.publicToken,
        clientName: boards.clientName, clientEmail: boards.clientEmail,
        status: boards.status, templateId: boards.templateId,
        createdBy: boards.createdBy, position: boards.position,
        createdAt: boards.createdAt, updatedAt: boards.updatedAt,
      })
      .from(boards)
      .where(eq(boards.id, id))
      .limit(1);
    if (!board) throw new NotFoundException("Board not found");

    // Fetch lists with their cards
    const boardLists = await db
      .select({
        id: lists.id, boardId: lists.boardId, title: lists.title,
        position: lists.position, color: lists.color,
        createdAt: lists.createdAt, updatedAt: lists.updatedAt,
      })
      .from(lists)
      .where(eq(lists.boardId, id))
      .orderBy(lists.position);

    const boardCards = await db
      .select({
        id: cards.id, listId: cards.listId, boardId: cards.boardId,
        publicId: cards.publicId, cardNumber: cards.cardNumber,
        title: cards.title, description: cards.description, position: cards.position,
        dueDate: cards.dueDate, completedAt: cards.completedAt,
        createdBy: cards.createdBy, createdAt: cards.createdAt, updatedAt: cards.updatedAt,
      })
      .from(cards)
      .where(eq(cards.boardId, id))
      .orderBy(cards.position);

    // Group cards by listId
    const cardsByList = new Map<string, typeof boardCards>();
    for (const card of boardCards) {
      const listCards = cardsByList.get(card.listId) ?? [];
      listCards.push(card);
      cardsByList.set(card.listId, listCards);
    }

    return {
      ...board,
      lists: boardLists.map((list) => ({
        ...list,
        cards: cardsByList.get(list.id) ?? [],
      })),
      stats: await this.getStats(id),
    };
  }

  async findByPublicToken(token: string) {
    const [board] = await db
      .select({
        id: boards.id, title: boards.title, slug: boards.slug,
        publicToken: boards.publicToken, clientName: boards.clientName,
        clientEmail: boards.clientEmail, status: boards.status,
      })
      .from(boards)
      .where(eq(boards.publicToken, token))
      .limit(1);
    if (!board) throw new NotFoundException("Board not found");
    return board;
  }

  async findPublicDetail(token: string) {
    const [board] = await db
      .select({
        id: boards.id, title: boards.title, description: boards.description,
        slug: boards.slug, publicId: boards.publicId, publicToken: boards.publicToken,
        clientName: boards.clientName, clientEmail: boards.clientEmail,
        status: boards.status, createdAt: boards.createdAt, updatedAt: boards.updatedAt,
      })
      .from(boards)
      .where(eq(boards.publicToken, token))
      .limit(1);
    if (!board) throw new NotFoundException("Board not found");

    const boardLists = await db
      .select({
        id: lists.id, boardId: lists.boardId, title: lists.title,
        position: lists.position, color: lists.color,
        createdAt: lists.createdAt, updatedAt: lists.updatedAt,
      })
      .from(lists)
      .where(eq(lists.boardId, board.id))
      .orderBy(lists.position);

    const boardCards = await db
      .select({
        id: cards.id, listId: cards.listId, boardId: cards.boardId,
        publicId: cards.publicId, cardNumber: cards.cardNumber,
        title: cards.title, description: cards.description, position: cards.position,
        dueDate: cards.dueDate, completedAt: cards.completedAt,
        createdBy: cards.createdBy, createdAt: cards.createdAt, updatedAt: cards.updatedAt,
      })
      .from(cards)
      .where(eq(cards.boardId, board.id))
      .orderBy(cards.position);

    // Only show client-visible data
    return {
      ...board,
      lists: boardLists.map((list) => ({
        ...list,
        cards: boardCards
          .filter((c) => c.listId === list.id)
          .map(({ completedAt, ...card }) => ({
            ...card,
            completed: completedAt !== null,
          })),
      })),
    };
  }

  /** Get a single card with only client-visible comments and attachments */
  async findPublicCardDetail(cardId: string) {
    const [card] = await db
      .select({
        id: cards.id, listId: cards.listId, boardId: cards.boardId,
        publicId: cards.publicId, cardNumber: cards.cardNumber,
        title: cards.title, description: cards.description, position: cards.position,
        dueDate: cards.dueDate, completedAt: cards.completedAt,
        createdAt: cards.createdAt, updatedAt: cards.updatedAt,
      })
      .from(cards)
      .where(eq(cards.id, cardId))
      .limit(1);
    if (!card) throw new NotFoundException("Card not found");

    // Only client-visible comments
    const comments = await db
      .select({
        id: cardComments.id, cardId: cardComments.cardId, authorId: cardComments.authorId,
        content: cardComments.content, visibility: cardComments.visibility,
        createdAt: cardComments.createdAt, updatedAt: cardComments.updatedAt,
      })
      .from(cardComments)
      .where(and(eq(cardComments.cardId, cardId), eq(cardComments.visibility, "client")))
      .orderBy(cardComments.createdAt);

    // Only client-visible attachments
    const attachments = await db
      .select({
        id: cardAttachments.id, cardId: cardAttachments.cardId,
        fileName: cardAttachments.fileName, fileUrl: cardAttachments.fileUrl,
        fileSize: cardAttachments.fileSize, mimeType: cardAttachments.mimeType,
        visibility: cardAttachments.visibility, createdAt: cardAttachments.createdAt,
      })
      .from(cardAttachments)
      .where(and(eq(cardAttachments.cardId, cardId), eq(cardAttachments.visibility, "client")))
      .orderBy(cardAttachments.createdAt);

    return {
      ...card,
      completed: card.completedAt !== null,
      labels: [],
      comments,
      attachments,
    };
  }

  async update(id: string, data: Partial<typeof boards.$inferInsert>) {
    const [board] = await db
      .update(boards)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(boards.id, id))
      .returning();
    if (!board) throw new NotFoundException("Board not found");
    return board;
  }

  async regenerateToken(id: string) {
    const newToken = crypto.randomBytes(24).toString("hex");
    return this.update(id, { publicToken: newToken });
  }

  async getStats(id: string) {
    const result = await db
      .select({
        totalCards: sql<number>`cast(count(${cards.id}) as integer)`,
        completedCards: sql<number>`cast(count(${cards.id}) filter (where ${cards.completedAt} is not null) as integer)`,
      })
      .from(lists)
      .leftJoin(cards, eq(lists.id, cards.listId))
      .where(eq(lists.boardId, id));

    const total = result[0]?.totalCards ?? 0;
    const completed = result[0]?.completedCards ?? 0;

    return {
      totalCards: total,
      completedCards: completed,
      completionPercentage: total === 0 ? 0 : Math.round((1.0 * completed / total) * 100),
    };
  }
}