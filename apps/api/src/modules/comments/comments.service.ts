import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { eq, and, sql } from "drizzle-orm";
import sanitizeHtml from "sanitize-html";
import { db } from "../../database/connection";
import { cardComments } from "../../database/schema";

@Injectable()
export class CommentsService {
  private readonly sanitizeOptions: sanitizeHtml.IOptions = {
    allowedTags: ["b", "i", "em", "strong", "a", "p", "br", "ul", "ol", "li", "code", "pre"],
    allowedAttributes: { a: ["href", "title"] },
    disallowedTagsMode: "escape",
  };

  private sanitize(content: string): string {
    return sanitizeHtml(content, this.sanitizeOptions);
  }

  async create(cardId: string, authorId: string, data: { content: string; visibility: string }) {
    const [comment] = await db
      .insert(cardComments)
      .values({
        cardId,
        authorId,
        content: this.sanitize(data.content),
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
        .where(and(eq(cardComments.cardId, cardId), eq(cardComments.visibility, visibility), sql`${cardComments.deletedAt} IS NULL`))
        .orderBy(cardComments.createdAt);
    }
    return db
      .select({
        id: cardComments.id, cardId: cardComments.cardId, authorId: cardComments.authorId,
        content: cardComments.content, visibility: cardComments.visibility,
        createdAt: cardComments.createdAt, updatedAt: cardComments.updatedAt,
      })
      .from(cardComments)
      .where(and(eq(cardComments.cardId, cardId), sql`${cardComments.deletedAt} IS NULL`))
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
      .set({ content: this.sanitize(content), updatedAt: new Date() })
      .where(eq(cardComments.id, id))
      .returning();
    return updated;
  }

  async remove(id: string, userId: string, userRole: string) {
    const [comment] = await db
      .select({
        id: cardComments.id, authorId: cardComments.authorId,
      })
      .from(cardComments)
      .where(eq(cardComments.id, id))
      .limit(1);
    if (!comment) throw new NotFoundException("Comment not found");
    if (comment.authorId !== userId && userRole !== "admin") {
      throw new ForbiddenException("Only author or admin can delete");
    }
    await db.update(cardComments).set({ deletedAt: new Date(), deletedBy: userId }).where(eq(cardComments.id, id));
  }
}