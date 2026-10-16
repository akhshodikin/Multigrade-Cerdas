ALTER TABLE "assessments" ADD COLUMN IF NOT EXISTS "tp_id" uuid REFERENCES "tujuan_pembelajaran"("id") ON DELETE set null;
--> statement-breakpoint
ALTER TABLE "assessments" ADD COLUMN IF NOT EXISTS "tp_code" text;
--> statement-breakpoint
ALTER TABLE "assessments" ADD COLUMN IF NOT EXISTS "phase" text;
--> statement-breakpoint
ALTER TABLE "assessments" ADD COLUMN IF NOT EXISTS "group_id" text REFERENCES "multigrade_groups"("id") ON DELETE set null;
--> statement-breakpoint
ALTER TABLE "assessments" ADD COLUMN IF NOT EXISTS "academic_year" text DEFAULT '2024/2025' NOT NULL;
--> statement-breakpoint
ALTER TABLE "assessments" ADD COLUMN IF NOT EXISTS "semester" text DEFAULT 'Ganjil' NOT NULL;
--> statement-breakpoint
ALTER TABLE "assessments" ADD COLUMN IF NOT EXISTS "instrument_type" text DEFAULT 'rubrik_observasi' NOT NULL;
--> statement-breakpoint
ALTER TABLE "assessments" ADD COLUMN IF NOT EXISTS "rubric_schema" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "assessments" ADD COLUMN IF NOT EXISTS "created_by_id" uuid REFERENCES "users"("id") ON DELETE set null;
--> statement-breakpoint
ALTER TABLE "assessments" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "student_assessment_results" ADD COLUMN IF NOT EXISTS "class_id" integer;
--> statement-breakpoint
ALTER TABLE "student_assessment_results" ADD COLUMN IF NOT EXISTS "subject_id" text;
--> statement-breakpoint
ALTER TABLE "student_assessment_results" ADD COLUMN IF NOT EXISTS "tp_id" uuid;
--> statement-breakpoint
ALTER TABLE "student_assessment_results" ADD COLUMN IF NOT EXISTS "learning_evidence" text;
--> statement-breakpoint
ALTER TABLE "student_assessment_results" ADD COLUMN IF NOT EXISTS "evidence_media_url" text;
--> statement-breakpoint
ALTER TABLE "student_assessment_results" ADD COLUMN IF NOT EXISTS "assessor_id" uuid REFERENCES "users"("id") ON DELETE set null;
--> statement-breakpoint
ALTER TABLE "student_assessment_results" ADD COLUMN IF NOT EXISTS "assessor_name" text;
--> statement-breakpoint
ALTER TABLE "student_assessment_results" ADD COLUMN IF NOT EXISTS "follow_up_type" text DEFAULT 'tidak_perlu' NOT NULL;
--> statement-breakpoint
ALTER TABLE "student_assessment_results" ADD COLUMN IF NOT EXISTS "follow_up_notes" text;
--> statement-breakpoint
ALTER TABLE "student_assessment_results" ADD COLUMN IF NOT EXISTS "ai_suggested_follow_up" text;
--> statement-breakpoint
ALTER TABLE "student_assessment_results" ADD COLUMN IF NOT EXISTS "follow_up_completed" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "student_assessment_results" ADD COLUMN IF NOT EXISTS "assessment_date" text;
--> statement-breakpoint
ALTER TABLE "student_assessment_results" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "school_assessment_criteria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" integer DEFAULT 1 NOT NULL,
	"academic_year" text DEFAULT '2024/2025' NOT NULL,
	"semester" text DEFAULT 'Ganjil' NOT NULL,
	"passing_score_default" integer DEFAULT 70 NOT NULL,
	"levels_definition" jsonb NOT NULL,
	"remedial_policy" text NOT NULL,
	"enrichment_policy" text NOT NULL,
	"non_numerical_rule_statement" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
