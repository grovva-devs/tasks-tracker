ALTER TABLE "card_comments" ADD COLUMN "deleted_by" uuid;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "due_soon_notified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "lists" ADD COLUMN "deleted_by" uuid;