import {Injectable} from "@nestjs/common";
import {eq, and} from "drizzle-orm";
import {db} from "../../database/connection";
import {boardMembers} from "../../database/schema";
import {users} from "../../database/schema";

@Injectable()
export class BoardMembersService {
  /** List all members of a board with user details */
  async findByBoard(boardId: string) {
    return db
      .select({
        boardId: boardMembers.boardId,
        userId: boardMembers.userId,
        addedAt: boardMembers.addedAt,
        userEmail: users.email,
        userDisplayName: users.displayName,
        userAvatarUrl: users.avatarUrl,
      })
      .from(boardMembers)
      .innerJoin(users, eq(boardMembers.userId, users.id))
      .where(eq(boardMembers.boardId, boardId));
  }

  /** Add a user to a board (idempotent) */
  async add(boardId: string, userId: string) {
    const [member] = await db
      .insert(boardMembers)
      .values({boardId, userId})
      .onConflictDoNothing()
      .returning();
    return member;
  }

  /** Remove a user from a board */
  async remove(boardId: string, userId: string) {
    await db
      .delete(boardMembers)
      .where(and(eq(boardMembers.boardId, boardId), eq(boardMembers.userId, userId)));
  }

  /** Check if a user is a member of a board */
  async isMember(boardId: string, userId: string): Promise<boolean> {
    const [found] = await db
      .select({boardId: boardMembers.boardId})
      .from(boardMembers)
      .where(and(eq(boardMembers.boardId, boardId), eq(boardMembers.userId, userId)))
      .limit(1);
    return !!found;
  }

  /** Auto-add the creator as a member when a board is created */
  async addCreator(boardId: string, creatorId: string) {
    return this.add(boardId, creatorId);
  }
}
