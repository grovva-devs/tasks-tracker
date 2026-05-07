import { CanActivate, ExecutionContext, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { db } from "../../database/connection";
import { boards, boardMembers } from "../../database/schema";
import { eq, and, sql } from "drizzle-orm";

@Injectable()
export class BoardMemberGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    const userRole = request.user?.role;
    const boardId = request.params?.id ?? request.params?.boardId;

    // Skip guard if no board ID in route params (e.g., list endpoints)
    if (!boardId) return true;

    // Single query: fetch board + check access in one round-trip
    const [board] = await db
      .select({
        id: boards.id,
        createdBy: boards.createdBy,
        hasAccess: sql<boolean>`
          CASE 
            WHEN ${userRole} = 'admin' THEN TRUE
            WHEN ${boards.createdBy} = ${userId} THEN TRUE
            WHEN EXISTS (
              SELECT 1 FROM ${boardMembers}
              WHERE ${boardMembers.boardId} = ${boards.id}
              AND ${boardMembers.userId} = ${userId}
            ) THEN TRUE
            ELSE FALSE
          END
        `,
      })
      .from(boards)
      .where(and(eq(boards.id, boardId), sql`${boards.deletedAt} IS NULL`))
      .limit(1);

    if (!board) throw new NotFoundException("Board not found");
    if (!board.hasAccess) throw new ForbiddenException("You do not have access to this board");
    return true;
  }
}