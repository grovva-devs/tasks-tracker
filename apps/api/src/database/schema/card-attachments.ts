import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { cards } from "./cards";
import { users } from "./users";

export const cardAttachments = pgTable(
  "card_attachments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cardId: uuid("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    fileUrl: text("file_url").notNull(),
    fileSize: integer("file_size").notNull(),
    mimeType: varchar("mime_type", { length: 100 }).notNull(),
    uploadedBy: uuid("uploaded_by")
      .notNull()
      .references(() => users.id),
    visibility: varchar("visibility", { length: 10 }).notNull().default("client"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("card_attachments_card_id_idx").on(table.cardId)],
);

export const cardAttachmentsRelations = relations(cardAttachments, ({ one }) => ({
  card: one(cards, {
    fields: [cardAttachments.cardId],
    references: [cards.id],
  }),
  uploader: one(users, {
    fields: [cardAttachments.uploadedBy],
    references: [users.id],
  }),
}));