import { pgTable, uuid, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { cards } from "./cards";
import { users } from "./users";

export const cardAssignees = pgTable(
  "card_assignees",
  {
    cardId: uuid("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    assignedAt: timestamp("assigned_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.cardId, table.userId] })],
);

export const cardAssigneesRelations = relations(cardAssignees, ({ one }) => ({
  card: one(cards, {
    fields: [cardAssignees.cardId],
    references: [cards.id],
  }),
  user: one(users, {
    fields: [cardAssignees.userId],
    references: [users.id],
  }),
}));