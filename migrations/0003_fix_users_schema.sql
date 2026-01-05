-- Add missing columns to users table
ALTER TABLE "users" ADD COLUMN "username" varchar(255) UNIQUE;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "full_name" varchar(255);
--> statement-breakpoint
ALTER TABLE "users" RENAME COLUMN "password" TO "password_hash";
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verified" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verification_token" text;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_reset_token" text;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_reset_expires" timestamp;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "preferred_role" "public"."user_role";
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_login_at" timestamp;
--> statement-breakpoint
-- Populate username and full_name from existing data
UPDATE "users" SET "username" = LOWER("email") WHERE "username" IS NULL;
--> statement-breakpoint
UPDATE "users" SET "full_name" = "name" WHERE "full_name" IS NULL;
--> statement-breakpoint
-- Make username and full_name NOT NULL after populating
ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "full_name" SET NOT NULL;
