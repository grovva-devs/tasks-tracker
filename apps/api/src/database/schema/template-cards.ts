import {
  pgTable,
  uuid,
  text,
  integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { templateLists } from "./template-lists";

export const templateCards = pgTable("template_cards", {
  id: uuid("id").defaultRandom().primaryKey(),
  templateListId: uuid("template_list_id")
    .notNull()
    .references(() => templateLists.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  position: integer("position").notNull().default(0),
  dueDateOffsetDays: integer("due_date_offset_days"),
});

export const templateCardsRelations = relations(templateCards, ({ one }) => ({
  templateList: one(templateLists, {
    fields: [templateCards.templateListId],
    references: [templateLists.id],
  }),
}));