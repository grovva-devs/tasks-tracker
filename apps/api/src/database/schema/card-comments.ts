import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { cards } from "./cards";
import { users } from "./users";

export const cardComments = pgTable(
  "card_comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cardId: uuid("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id),
    content: text("content").notNull(),
    visibility: varchar("visibility", { length: 10 }).notNull().default("internal"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: uuid("deleted_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("card_comments_card_id_idx").on(table.cardId)],
);

export const cardCommentsRelations = relations(cardComments, ({ one }) => ({
  card: one(cards, {
    fields: [cardComments.cardId],
    references: [cards.id],
  }),
  author: one(users, {
    fields: [cardComments.authorId],
    references: [users.id],
  }),
}));