ALTER TABLE "multigrade_lesson_plans" ADD COLUMN IF NOT EXISTS "phase" text DEFAULT 'Fase A' NOT NULL;
--> statement-breakpoint
ALTER TABLE "multigrade_lesson_plans" ADD COLUMN IF NOT EXISTS "grades" text DEFAULT '1,2' NOT NULL;
--> statement-breakpoint
ALTER TABLE "multigrade_lesson_plans" ADD COLUMN IF NOT EXISTS "academic_year" text DEFAULT '2024/2025' NOT NULL;
--> statement-breakpoint
ALTER TABLE "multigrade_lesson_plans" ADD COLUMN IF NOT EXISTS "semester" text DEFAULT 'Ganjil' NOT NULL;
--> statement-breakpoint
ALTER TABLE "multigrade_lesson_plans" ADD COLUMN IF NOT EXISTS "allocated_hours" integer DEFAULT 2 NOT NULL;
--> statement-breakpoint
ALTER TABLE "multigrade_lesson_plans" ADD COLUMN IF NOT EXISTS "essential_material" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "multigrade_lesson_plans" ADD COLUMN IF NOT EXISTS "initial_competency" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "multigrade_lesson_plans" ADD COLUMN IF NOT EXISTS "learning_objectives" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "multigrade_lesson_plans" ADD COLUMN IF NOT EXISTS "curriculum_references" jsonb DEFAULT '{}'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "multigrade_lesson_plans" ADD COLUMN IF NOT EXISTS "media_and_resources" jsonb DEFAULT '{}'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "multigrade_lesson_plans" ADD COLUMN IF NOT EXISTS "teaching_steps" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "multigrade_lesson_plans" ADD COLUMN IF NOT EXISTS "differentiation" jsonb DEFAULT '{}'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "multigrade_lesson_plans" ADD COLUMN IF NOT EXISTS "assessments" jsonb DEFAULT '{}'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "multigrade_lesson_plans" ADD COLUMN IF NOT EXISTS "reflections" jsonb DEFAULT '{}'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "multigrade_lesson_plans" ADD COLUMN IF NOT EXISTS "remedial_and_enrichment" jsonb DEFAULT '{}'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "multigrade_lesson_plans" ADD COLUMN IF NOT EXISTS "teacher_notes" text;
--> statement-breakpoint
ALTER TABLE "multigrade_lesson_plans" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'draft' NOT NULL;
--> statement-breakpoint
ALTER TABLE "multigrade_lesson_plans" ADD COLUMN IF NOT EXISTS "approved_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "multigrade_lesson_plans" ADD COLUMN IF NOT EXISTS "approved_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "multigrade_lesson_plans" ADD COLUMN IF NOT EXISTS "rejection_notes" text;
--> statement-breakpoint
ALTER TABLE "multigrade_lesson_plans" ADD COLUMN IF NOT EXISTS "version" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE "multigrade_lesson_plans" ADD COLUMN IF NOT EXISTS "version_notes" text;
--> statement-breakpoint
ALTER TABLE "multigrade_lesson_plans" ADD COLUMN IF NOT EXISTS "cloned_from_id" uuid;
--> statement-breakpoint
ALTER TABLE "multigrade_lesson_plans" ADD COLUMN IF NOT EXISTS "ai_provider" text DEFAULT 'manual' NOT NULL;
--> statement-breakpoint
ALTER TABLE "multigrade_lesson_plans" ADD COLUMN IF NOT EXISTS "ai_model" text DEFAULT 'manual' NOT NULL;
