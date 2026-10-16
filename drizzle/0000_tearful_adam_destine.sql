CREATE TABLE "academic_terms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"year" text NOT NULL,
	"semester" text NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"start_date" text,
	"end_date" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_plan_id" uuid,
	"subject_id" text NOT NULL,
	"class_id" integer NOT NULL,
	"title" text NOT NULL,
	"assessment_type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"user_name" text,
	"user_role" text,
	"action" text NOT NULL,
	"target_entity" text NOT NULL,
	"target_id" text,
	"details" jsonb,
	"ip_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "classes" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"group_id" text NOT NULL,
	"phase" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learning_objectives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_id" text NOT NULL,
	"phase" text NOT NULL,
	"grade_level" integer,
	"code" text NOT NULL,
	"description" text NOT NULL,
	"source_document" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "multigrade_groups" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phase" text NOT NULL,
	"grades" text NOT NULL,
	"lead_teacher_id" uuid,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "multigrade_lesson_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"group_id" text NOT NULL,
	"subject_id" text NOT NULL,
	"topic" text NOT NULL,
	"duration_minutes" integer DEFAULT 70 NOT NULL,
	"differentiated_strategy" jsonb NOT NULL,
	"teacher_id" uuid,
	"ai_assisted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offline_sync_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_entity_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"action" text NOT NULL,
	"payload" jsonb NOT NULL,
	"sync_status" text DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"queued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"synced_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "school_profile" (
	"id" integer PRIMARY KEY NOT NULL,
	"npsn" text DEFAULT '20519000' NOT NULL,
	"name" text DEFAULT 'SDN SEDAENG II Tosari' NOT NULL,
	"address" text DEFAULT 'Dusun Sedaeng, Desa Sedaeng, Kec. Tosari, Kab. Pasuruan, Jawa Timur 67177' NOT NULL,
	"headmaster_name" text DEFAULT 'Kepala Sekolah SDN Sedaeng II' NOT NULL,
	"headmaster_nip" text DEFAULT '197508122000031002',
	"phone" text DEFAULT '081234567890',
	"email" text DEFAULT 'sdnsedaeng2tosari@gmail.com',
	"active_academic_year" text DEFAULT '2024/2025' NOT NULL,
	"active_semester" text DEFAULT 'Ganjil' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_assessment_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"score" integer,
	"mastery_level" text,
	"teacher_notes" text,
	"assessed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_code" text NOT NULL,
	"display_name" text NOT NULL,
	"full_name" text NOT NULL,
	"class_id" integer NOT NULL,
	"group_id" text NOT NULL,
	"gender" text NOT NULL,
	"birth_date" text,
	"guardian_name" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "students_student_code_unique" UNIQUE("student_code")
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"target_phases" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'teacher' NOT NULL,
	"nip" text,
	"phone" text,
	"assigned_group_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_lesson_plan_id_multigrade_lesson_plans_id_fk" FOREIGN KEY ("lesson_plan_id") REFERENCES "public"."multigrade_lesson_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_group_id_multigrade_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."multigrade_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_objectives" ADD CONSTRAINT "learning_objectives_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "multigrade_lesson_plans" ADD CONSTRAINT "multigrade_lesson_plans_group_id_multigrade_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."multigrade_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "multigrade_lesson_plans" ADD CONSTRAINT "multigrade_lesson_plans_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "multigrade_lesson_plans" ADD CONSTRAINT "multigrade_lesson_plans_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_assessment_results" ADD CONSTRAINT "student_assessment_results_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_assessment_results" ADD CONSTRAINT "student_assessment_results_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_group_id_multigrade_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."multigrade_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_assigned_group_id_multigrade_groups_id_fk" FOREIGN KEY ("assigned_group_id") REFERENCES "public"."multigrade_groups"("id") ON DELETE no action ON UPDATE no action;