CREATE TABLE IF NOT EXISTS "multigrade_material_maps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" text NOT NULL,
	"subject_id" text NOT NULL,
	"academic_year" text DEFAULT '2024/2025' NOT NULL,
	"semester" text DEFAULT 'Ganjil' NOT NULL,
	"duration_minutes" integer DEFAULT 70 NOT NULL,
	"shared_theme" text NOT NULL,
	"student_conditions" text,
	"mapping_strategy" text NOT NULL,
	"ai_provider" text NOT NULL,
	"ai_model" text NOT NULL,
	"confidence_level" text DEFAULT 'sedang' NOT NULL,
	"confidence_score" integer DEFAULT 75 NOT NULL,
	"confidence_disclaimer" text NOT NULL,
	"structured_output" jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"teacher_notes" text,
	"rejection_reason" text,
	"created_by_id" uuid,
	"approved_by_id" uuid,
	"approved_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_usage_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"feature" text NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"prompt_tokens" integer DEFAULT 0 NOT NULL,
	"completion_tokens" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"estimated_cost_usd" text DEFAULT '0.0000' NOT NULL,
	"latency_ms" integer DEFAULT 0 NOT NULL,
	"status" text NOT NULL,
	"error_message" text,
	"user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "multigrade_material_maps" ADD CONSTRAINT "multigrade_material_maps_group_id_multigrade_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."multigrade_groups"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "multigrade_material_maps" ADD CONSTRAINT "multigrade_material_maps_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "multigrade_material_maps" ADD CONSTRAINT "multigrade_material_maps_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "multigrade_material_maps" ADD CONSTRAINT "multigrade_material_maps_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_usage_logs" ADD CONSTRAINT "ai_usage_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
