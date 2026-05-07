import {
  pgTable,
  uuid,
  varchar,
  integer,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const templateCategories = pgTable("template_categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  position: integer("position").notNull().default(0),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  deletedBy: uuid("deleted_by"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});