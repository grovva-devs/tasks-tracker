ALTER TABLE "card_attachments" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "card_attachments" ADD COLUMN "deleted_by" uuid;--> statement-breakpoint
ALTER TABLE "labels" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "labels" ADD COLUMN "deleted_by" uuid;--> statement-breakpoint
ALTER TABLE "template_categories" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "template_categories" ADD COLUMN "deleted_by" uuid;--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN "deleted_by" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "webhooks" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "webhooks" ADD COLUMN "deleted_by" uuid;