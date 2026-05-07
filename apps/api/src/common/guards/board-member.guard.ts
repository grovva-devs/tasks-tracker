import { CanActivate, ExecutionContext, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { db } from "../../database/connection";
import { boards, boardMembers } from "../../database/schema";
import { eq, and } from "drizzle-orm";

@Injectable()
export class BoardMemberGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    const userRole = request.user?.role;
    const boardId = request.params?.id ?? request.params?.boardId;

    // Skip guard if no board ID in route params (e.g., list endpoints)
    if (!boardId) return true;

    const [board] = await db
      .select({ id: boards.id, createdBy: boards.createdBy })
      .from(boards)
      .where(eq(boards.id, boardId))
      .limit(1);

    if (!board) throw new NotFoundException("Board not found");

    if (userRole === "admin" || board.createdBy === userId) {
      return true;
    }

    // Check board_members table for collaborative access
    const [membership] = await db
      .select({ boardId: boardMembers.boardId })
      .from(boardMembers)
      .where(and(eq(boardMembers.boardId, boardId), eq(boardMembers.userId, userId)))
      .limit(1);

    if (membership) {
      return true;
    }

    throw new ForbiddenException("You do not have access to this board");
  }
}