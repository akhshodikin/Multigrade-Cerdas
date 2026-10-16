ALTER TABLE "atp_plans" ADD COLUMN IF NOT EXISTS "rejection_notes" text;
--> statement-breakpoint
ALTER TABLE "atp_plans" ADD COLUMN IF NOT EXISTS "in_use_at" timestamp with time zone;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "validation_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"total_issues" integer DEFAULT 0 NOT NULL,
	"critical_count" integer DEFAULT 0 NOT NULL,
	"warning_count" integer DEFAULT 0 NOT NULL,
	"info_count" integer DEFAULT 0 NOT NULL,
	"pedagogical_disclaimer" text NOT NULL,
	"reviewed_by_id" uuid,
	"reviewed_by_name" text,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "validation_issues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid,
	"rule_code" text NOT NULL,
	"title" text NOT NULL,
	"severity" text NOT NULL,
	"source_location" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"description" text NOT NULL,
	"recommendation" text NOT NULL,
	"resolution_status" text DEFAULT 'terbuka' NOT NULL,
	"resolution_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "validation_reports" ADD CONSTRAINT "validation_reports_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "validation_issues" ADD CONSTRAINT "validation_issues_report_id_validation_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."validation_reports"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
