import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { templates } from "./templates";

export const templateVariables = pgTable("template_variables", {
  id: uuid("id").defaultRandom().primaryKey(),
  templateId: uuid("template_id")
    .notNull()
    .references(() => templates.id, { onDelete: "cascade" }),
  key: varchar("key", { length: 100 }).notNull(),
  displayName: varchar("display_name", { length: 255 }).notNull(),
  defaultValue: text("default_value"),
  isRequired: boolean("is_required").notNull().default(true),
});

export const templateVariablesRelations = relations(
  templateVariables,
  ({ one }) => ({
    template: one(templates, {
      fields: [templateVariables.templateId],
      references: [templates.id],
    }),
  }),
);