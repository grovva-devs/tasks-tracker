ALTER TABLE "settings" ADD COLUMN "smtp_host" varchar(255);--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "smtp_port" integer;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "smtp_user" varchar(255);--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "smtp_password" text;