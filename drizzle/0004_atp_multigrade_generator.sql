ALTER TABLE "atp_plans" ADD COLUMN IF NOT EXISTS "group_id" text REFERENCES "multigrade_groups"("id");
--> statement-breakpoint
ALTER TABLE "atp_plans" ADD COLUMN IF NOT EXISTS "target_grade" integer;
--> statement-breakpoint
ALTER TABLE "atp_plans" ADD COLUMN IF NOT EXISTS "semester" text DEFAULT 'Semua' NOT NULL;
--> statement-breakpoint
ALTER TABLE "atp_plans" ADD COLUMN IF NOT EXISTS "effective_weeks" integer DEFAULT 36 NOT NULL;
--> statement-breakpoint
ALTER TABLE "atp_plans" ADD COLUMN IF NOT EXISTS "description" text;
--> statement-breakpoint
ALTER TABLE "atp_items" ADD COLUMN IF NOT EXISTS "start_week" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE "atp_items" ADD COLUMN IF NOT EXISTS "end_week" integer DEFAULT 2 NOT NULL;
--> statement-breakpoint
ALTER TABLE "atp_items" ADD COLUMN IF NOT EXISTS "month_name" text;
--> statement-breakpoint
ALTER TABLE "atp_items" ADD COLUMN IF NOT EXISTS "multigrade_strategy" text DEFAULT 'terpadu_sebagian';
--> statement-breakpoint
ALTER TABLE "atp_items" ADD COLUMN IF NOT EXISTS "paired_tp_id" uuid REFERENCES "tujuan_pembelajaran"("id") ON DELETE SET NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "academic_calendars" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "academic_year" text DEFAULT '2024/2025' NOT NULL,
  "semester" text NOT NULL,
  "title" text NOT NULL,
  "effective_weeks_count" integer DEFAULT 18 NOT NULL,
  "non_effective_weeks_count" integer DEFAULT 2 NOT NULL,
  "events" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
