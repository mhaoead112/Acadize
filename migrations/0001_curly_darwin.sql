CREATE TABLE "courses" (
	"id" text PRIMARY KEY NOT NULL,
	"description" text NOT NULL,
	"teacher_id" text NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
