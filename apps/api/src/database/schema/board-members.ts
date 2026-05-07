import {pgTable, uuid, timestamp, primaryKey, index} from "drizzle-orm/pg-core";
import {relations} from "drizzle-orm";
import {boards} from "./boards";
import {users} from "./users";

export const boardMembers = pgTable(
  "board_members",
  {
    boardId: uuid("board_id")
      .notNull()
      .references(() => boards.id, {onDelete: "cascade"}),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, {onDelete: "cascade"}),
    addedAt: timestamp("added_at", {withTimezone: true})
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({columns: [table.boardId, table.userId]}),
    index("board_members_user_id_idx").on(table.userId),
  ],
);

export const boardMembersRelations = relations(boardMembers, ({one}) => ({
  board: one(boards, {
    fields: [boardMembers.boardId],
    references: [boards.id],
  }),
  user: one(users, {
    fields: [boardMembers.userId],
    references: [users.id],
  }),
}));
