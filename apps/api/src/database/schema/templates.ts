import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { templateCategories } from "./template-categories";
import { templateLists } from "./template-lists";
import { templateVariables } from "./template-variables";

export const templates = pgTable("templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  categoryId: uuid("category_id").references(() => templateCategories.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  isDefault: boolean("is_default").notNull().default(false),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const templatesRelations = relations(templates, ({ one, many }) => ({
  category: one(templateCategories, {
    fields: [templates.categoryId],
    references: [templateCategories.id],
  }),
  creator: one(users, {
    fields: [templates.createdBy],
    references: [users.id],
  }),
  lists: many(templateLists),
  variables: many(templateVariables),
}));