import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { eq, and } from "drizzle-orm";
import { db } from "../../database/connection";
import { cardComments } from "../../database/schema";

@Injectable()
export class CommentsService {
  async create(cardId: string, authorId: string, data: { content: string; visibility: string }) {
    const [comment] = await db
      .insert(cardComments)
      .values({
        cardId,
        authorId,
        content: data.content,
        visibility: data.visibility,
      })
      .returning();
    return comment;
  }

  async findByCard(cardId: string, visibility?: string) {
    if (visibility) {
      return db
        .select({
          id: cardComments.id, cardId: cardComments.cardId, authorId: cardComments.authorId,
          content: cardComments.content, visibility: cardComments.visibility,
          createdAt: cardComments.createdAt, updatedAt: cardComments.updatedAt,
        })
        .from(cardComments)
        .where(and(eq(cardComments.cardId, cardId), eq(cardComments.visibility, visibility)))
        .orderBy(cardComments.createdAt);
    }
    return db
      .select({
        id: cardComments.id, cardId: cardComments.cardId, authorId: cardComments.authorId,
        content: cardComments.content, visibility: cardComments.visibility,
        createdAt: cardComments.createdAt, updatedAt: cardComments.updatedAt,
      })
      .from(cardComments)
      .where(eq(cardComments.cardId, cardId))
      .orderBy(cardComments.createdAt);
  }

  async update(id: string, authorId: string, content: string) {
    const [comment] = await db
      .select({
        id: cardComments.id, cardId: cardComments.cardId, authorId: cardComments.authorId,
        content: cardComments.content, visibility: cardComments.visibility,
        createdAt: cardComments.createdAt, updatedAt: cardComments.updatedAt,
      })
      .from(cardComments)
      .where(eq(cardComments.id, id))
      .limit(1);

    if (!comment) throw new NotFoundException("Comment not found");
    if (comment.authorId !== authorId) throw new ForbiddenException("Not the author");

    const [updated] = await db
      .update(cardComments)
      .set({ content, updatedAt: new Date() })
      .where(eq(cardComments.id, id))
      .returning();
    return updated;
  }

  async remove(id: string) {
    await db.delete(cardComments).where(eq(cardComments.id, id));
  }
}