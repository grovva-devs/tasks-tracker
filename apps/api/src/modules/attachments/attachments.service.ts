import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { db } from "../../database/connection";
import { cardAttachments } from "../../database/schema";
import { eq, and, sql } from "drizzle-orm";

@Injectable()
export class AttachmentsService {
  async create(data: {
    cardId: string;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
    uploadedBy: string;
    visibility: string;
  }) {
    const [attachment] = await db.insert(cardAttachments).values(data).returning();
    return attachment;
  }

  async findByCard(cardId: string) {
    return db
      .select({
        id: cardAttachments.id, cardId: cardAttachments.cardId,
        fileName: cardAttachments.fileName, fileUrl: cardAttachments.fileUrl,
        fileSize: cardAttachments.fileSize, mimeType: cardAttachments.mimeType,
        visibility: cardAttachments.visibility, createdAt: cardAttachments.createdAt,
      })
      .from(cardAttachments)
      .where(and(eq(cardAttachments.cardId, cardId), sql`${cardAttachments.deletedAt} IS NULL`))
      .orderBy(cardAttachments.createdAt);
  }

  async remove(id: string, userId: string, userRole: string) {
    const [attachment] = await db
      .select({ id: cardAttachments.id, uploadedBy: cardAttachments.uploadedBy })
      .from(cardAttachments)
      .where(eq(cardAttachments.id, id))
      .limit(1);
    if (!attachment) throw new NotFoundException("Attachment not found");
    if (attachment.uploadedBy !== userId && userRole !== "admin") {
      throw new ForbiddenException("Only uploader or admin can delete");
    }
    await db.delete(cardAttachments).where(eq(cardAttachments.id, id));
  }
}