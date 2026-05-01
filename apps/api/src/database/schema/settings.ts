import {
  pgTable,
  integer,
  varchar,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const settings = pgTable("settings", {
  id: integer("id").primaryKey().default(1),
  companyName: varchar("company_name", { length: 255 }).notNull().default("My Company"),
  logoUrl: text("logo_url"),
  primaryColor: varchar("primary_color", { length: 7 }).notNull().default("#3B82F6"),
  emailFrom: varchar("email_from", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});