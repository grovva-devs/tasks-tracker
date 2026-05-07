import { Injectable } from "@nestjs/common";
import { eq, sql, desc, and } from "drizzle-orm";
import { db } from "../../database/connection";
import { boards, boardActivities, cards } from "../../database/schema";

@Injectable()
export class DashboardService {
  async getOverview() {
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(boards)
      .where(sql`${boards.deletedAt} IS NULL`);

    const [activeResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(boards)
      .where(and(eq(boards.status, "active"), sql`${boards.deletedAt} IS NULL`));

    const [completedResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(boards)
      .where(and(eq(boards.status, "completed"), sql`${boards.deletedAt} IS NULL`));

    const total = totalResult?.count ?? 0;
    const active = activeResult?.count ?? 0;
    const completed = completedResult?.count ?? 0;

    // Average completion percentage across active boards
    let avgCompletionPercentage = 0;
    if (active > 0) {
      const statsResult = await db.execute(sql`
        SELECT AVG(
          CASE WHEN total > 0 THEN ROUND((completed::numeric / total::numeric) * 100) ELSE 0 END
        )::int as avg_pct
        FROM (
          SELECT b.id,
            COUNT(c.id) FILTER (WHERE c.deleted_at IS NULL) as total,
            COUNT(c.id) FILTER (WHERE c.completed_at IS NOT NULL AND c.deleted_at IS NULL) as completed
          FROM boards b
          LEFT JOIN cards c ON c.board_id = b.id
          WHERE b.status = 'active' AND b.deleted_at IS NULL
          GROUP BY b.id
        ) board_stats
      `);
      avgCompletionPercentage = Number((statsResult[0] as any)?.avg_pct ?? 0);
    }

    return {
      totalBoards: total,
      activeBoards: active,
      completedBoards: completed,
      archivedBoards: total - active - completed,
      avgCompletionPercentage,
      completedBoardPercentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }

  async getRecentActivity(limit = 20) {
    return db
      .select({
        id: boardActivities.id,
        boardId: boardActivities.boardId,
        boardTitle: boards.title,
        boardSlug: boards.slug,
        action: boardActivities.action,
        description: boardActivities.description,
        createdAt: boardActivities.createdAt,
      })
      .from(boardActivities)
      .innerJoin(boards, eq(boardActivities.boardId, boards.id))
      .where(sql`${boards.deletedAt} IS NULL`)
      .orderBy(desc(boardActivities.createdAt))
      .limit(limit);
  }
}