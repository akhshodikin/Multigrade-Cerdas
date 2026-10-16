UPDATE school_profile
SET name = 'SDN Kandangan I Tosari',
    npsn = '20519069',
    address = 'Dusun Kandangan, Desa Kandangan, Kec. Tosari, Kab. Pasuruan, Jawa Timur 67177',
    headmaster_name = 'Bambang Sutrisno, S.Pd., M.Pd.',
    email = 'sdnkandangan1tosari@gmail.com'
WHERE id = 1 AND (name LIKE '%Sedaeng%' OR name LIKE '%SEDAENG%');
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "teaching_journals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "date" text NOT NULL,
  "group_id" text NOT NULL REFERENCES "multigrade_groups"("id"),
  "subject_id" text NOT NULL REFERENCES "subjects"("id"),
  "lesson_plan_id" uuid REFERENCES "multigrade_lesson_plans"("id") ON DELETE SET NULL,
  "academic_year" text DEFAULT '2024/2025' NOT NULL,
  "semester" text DEFAULT 'Ganjil' NOT NULL,
  "allocated_hours" integer DEFAULT 2 NOT NULL,
  "lower_grade" integer NOT NULL,
  "higher_grade" integer NOT NULL,
  "lower_grade_tp_code" text,
  "lower_grade_tp_text" text,
  "higher_grade_tp_code" text,
  "higher_grade_tp_text" text,
  "rotation_activity_description" text NOT NULL,
  "attendance_present" integer DEFAULT 0 NOT NULL,
  "attendance_sick" integer DEFAULT 0 NOT NULL,
  "attendance_permit" integer DEFAULT 0 NOT NULL,
  "attendance_absent" integer DEFAULT 0 NOT NULL,
  "learning_evidence_summary" text,
  "challenges_encountered" text,
  "teacher_reflection" text NOT NULL,
  "next_action_plan" text NOT NULL,
  "teacher_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "teacher_name" text,
  "verified_by_headmaster" boolean DEFAULT false NOT NULL,
  "verified_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "report_export_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "report_type" text NOT NULL,
  "title" text NOT NULL,
  "format" text NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  "target_entity_id" text,
  "filter_parameters" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "file_size_bytes" integer DEFAULT 0 NOT NULL,
  "checksum" text,
  "status" text DEFAULT 'success' NOT NULL,
  "error_message" text,
  "generated_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "generated_by_name" text,
  "generated_by_role" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
