import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  date,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { lists } from "./lists";
import { boardActivities } from "./board-activities";
import { cardComments } from "./card-comments";
import { cardAttachments } from "./card-attachments";
import { cardAssignees } from "./card-assignees";
import { cardLabels } from "./card-labels";

export const cards = pgTable(
  "cards",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    listId: uuid("list_id")
      .notNull()
      .references(() => lists.id, { onDelete: "cascade" }),
    boardId: uuid("board_id").notNull(),
    publicId: varchar("public_id", { length: 12 }).notNull(),
    cardNumber: integer("card_number").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    position: integer("position").notNull().default(0),
    dueDate: date("due_date"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: uuid("deleted_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("cards_list_id_idx").on(table.listId),
    index("cards_board_id_idx").on(table.boardId),
    index("cards_board_id_card_number_idx").on(table.boardId, table.cardNumber),
  ],
);

export const cardsRelations = relations(cards, ({ one, many }) => ({
  list: one(lists, {
    fields: [cards.listId],
    references: [lists.id],
  }),
  activities: many(boardActivities),
  comments: many(cardComments),
  attachments: many(cardAttachments),
  assignees: many(cardAssignees),
  labels: many(cardLabels),
}));