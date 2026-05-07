import { Injectable } from "@nestjs/common";
import { eq, desc, sql } from "drizzle-orm";
import { db } from "../../database/connection";
import { boardActivities } from "../../database/schema";

@Injectable()
export class ActivitiesService {
  async create(data: {
    boardId: string;
    cardId?: string;
    userId: string;
    action: string;
    description?: string | null;
  }) {
    const [activity] = await db
      .insert(boardActivities)
      .values({
        boardId: data.boardId,
        cardId: data.cardId ?? null,
        userId: data.userId,
        action: data.action,
        description: data.description ?? null,
      })
      .returning();
    return activity;
  }

  async findByBoard(
    boardId: string,
    options: { limit?: number; offset?: number } = {},
  ) {
    return db
      .select({
        id: boardActivities.id,
        boardId: boardActivities.boardId,
        cardId: boardActivities.cardId,
        userId: boardActivities.userId,
        action: boardActivities.action,
        description: boardActivities.description,
        createdAt: boardActivities.createdAt,
      })
      .from(boardActivities)
      .where(eq(boardActivities.boardId, boardId))
      .orderBy(desc(boardActivities.createdAt))
      .limit(options.limit ?? 50)
      .offset(options.offset ?? 0);
  }
}
