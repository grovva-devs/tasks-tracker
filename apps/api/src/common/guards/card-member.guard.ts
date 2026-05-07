import { CanActivate, ExecutionContext, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { db } from "../../database/connection";
import { cards, boards, boardMembers } from "../../database/schema";
import { eq, and, sql } from "drizzle-orm";

@Injectable()
export class CardMemberGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    const userRole = request.user?.role;
    const cardId = request.params?.id ?? request.params?.cardId;

    if (!cardId) return true;

    // 1. Find the card to get its boardId
    const [card] = await db
      .select({ id: cards.id, boardId: cards.boardId })
      .from(cards)
      .where(and(eq(cards.id, cardId), sql`${cards.deletedAt} IS NULL`))
      .limit(1);

    if (!card) throw new NotFoundException("Card not found");

    // 2. Check board access using same logic as BoardMemberGuard
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
      .where(and(eq(boards.id, card.boardId), sql`${boards.deletedAt} IS NULL`))
      .limit(1);

    if (!board) throw new NotFoundException("Board not found");
    if (!board.hasAccess) throw new ForbiddenException("You do not have access to this card");
    return true;
  }
}
