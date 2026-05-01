import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { boards } from "./boards";
import { cards } from "./cards";
import { users } from "./users";

export const boardActivities = pgTable(
  "board_activities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    boardId: uuid("board_id")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    cardId: uuid("card_id").references(() => cards.id, { onDelete: "set null" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    action: varchar("action", { length: 50 }).notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("board_activities_board_id_idx").on(table.boardId),
    index("board_activities_card_id_idx").on(table.cardId),
  ],
);

export const boardActivitiesRelations = relations(boardActivities, ({ one }) => ({
  board: one(boards, {
    fields: [boardActivities.boardId],
    references: [boards.id],
  }),
  card: one(cards, {
    fields: [boardActivities.cardId],
    references: [cards.id],
  }),
  user: one(users, {
    fields: [boardActivities.userId],
    references: [users.id],
  }),
}));