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
import { users } from "./users";
import { lists } from "./lists";

export const boards = pgTable(
  "boards",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    publicId: varchar("public_id", { length: 12 }).notNull().unique(),
    publicToken: varchar("public_token", { length: 64 }).notNull().unique(),
    clientName: varchar("client_name", { length: 255 }).notNull(),
    clientEmail: varchar("client_email", { length: 255 }),
    status: varchar("status", { length: 20 }).notNull().default("active"),
    templateId: uuid("template_id"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    position: integer("position").notNull().default(0),
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
    index("boards_status_idx").on(table.status),
    index("boards_created_by_idx").on(table.createdBy),
  ],
);

export const boardsRelations = relations(boards, ({ one, many }) => ({
  creator: one(users, {
    fields: [boards.createdBy],
    references: [users.id],
    relationName: "boardCreator",
  }),
  lists: many(lists),
}));