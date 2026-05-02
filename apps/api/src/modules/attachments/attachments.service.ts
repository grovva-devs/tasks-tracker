import { Injectable } from "@nestjs/common";
import { db } from "../../database/connection";
import { cardAttachments } from "../../database/schema";
import { eq } from "drizzle-orm";

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
      .where(eq(cardAttachments.cardId, cardId))
      .orderBy(cardAttachments.createdAt);
  }

  async remove(id: string) {
    await db.delete(cardAttachments).where(eq(cardAttachments.id, id));
  }
}