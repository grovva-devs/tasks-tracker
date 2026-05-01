import {
  pgTable,
  uuid,
  varchar,
  integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { templates } from "./templates";
import { templateCards } from "./template-cards";

export const templateLists = pgTable("template_lists", {
  id: uuid("id").defaultRandom().primaryKey(),
  templateId: uuid("template_id")
    .notNull()
    .references(() => templates.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  position: integer("position").notNull().default(0),
  color: varchar("color", { length: 7 }),
});

export const templateListsRelations = relations(templateLists, ({ one, many }) => ({
  template: one(templates, {
    fields: [templateLists.templateId],
    references: [templates.id],
  }),
  cards: many(templateCards),
}));