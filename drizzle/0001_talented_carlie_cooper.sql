CREATE TABLE "atp_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"atp_plan_id" uuid NOT NULL,
	"tp_id" uuid NOT NULL,
	"sequence_order" integer NOT NULL,
	"allocated_hours" integer DEFAULT 4 NOT NULL,
	"target_grade" integer NOT NULL,
	"semester" text NOT NULL,
	"multigrade_notes" text
);
--> statement-breakpoint
CREATE TABLE "atp_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"subject_id" text NOT NULL,
	"phase" text NOT NULL,
	"academic_year" text DEFAULT '2024/2025' NOT NULL,
	"total_hours" integer DEFAULT 72 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"author_id" uuid,
	"approved_by_id" uuid,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "capaian_pembelajaran" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_id" text NOT NULL,
	"phase" text NOT NULL,
	"element" text NOT NULL,
	"source_document_id" uuid,
	"source_page" text,
	"source_section" text,
	"original_source_text" text NOT NULL,
	"ai_interpretation" text,
	"duplicate_hash" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"verification_status" text DEFAULT 'draft' NOT NULL,
	"review_notes" text,
	"created_by_id" uuid,
	"approved_by_id" uuid,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "curriculum_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"document_number" text NOT NULL,
	"issuing_authority" text DEFAULT 'BSKAP Kemendikbudristek' NOT NULL,
	"publication_year" integer DEFAULT 2024 NOT NULL,
	"file_type" text NOT NULL,
	"file_name" text,
	"file_size" integer,
	"extracted_text" text,
	"needs_manual_review" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"version" text DEFAULT 'v1.0' NOT NULL,
	"uploaded_by_id" uuid,
	"verified_by_id" uuid,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "curriculum_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"version_number" integer NOT NULL,
	"change_type" text NOT NULL,
	"changed_by_id" uuid,
	"changed_by_name" text,
	"previous_snapshot" jsonb,
	"current_snapshot" jsonb,
	"change_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tp_prerequisites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tp_id" uuid NOT NULL,
	"prerequisite_tp_id" uuid NOT NULL,
	"prerequisite_type" text DEFAULT 'wajib' NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "tujuan_pembelajaran" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cp_id" uuid,
	"subject_id" text NOT NULL,
	"phase" text NOT NULL,
	"target_grade" integer,
	"code" text NOT NULL,
	"competency" text NOT NULL,
	"content_scope" text NOT NULL,
	"description" text NOT NULL,
	"source_type" text DEFAULT 'derived_teacher' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"verification_status" text DEFAULT 'draft' NOT NULL,
	"created_by_id" uuid,
	"approved_by_id" uuid,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "atp_items" ADD CONSTRAINT "atp_items_atp_plan_id_atp_plans_id_fk" FOREIGN KEY ("atp_plan_id") REFERENCES "public"."atp_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "atp_items" ADD CONSTRAINT "atp_items_tp_id_tujuan_pembelajaran_id_fk" FOREIGN KEY ("tp_id") REFERENCES "public"."tujuan_pembelajaran"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "atp_plans" ADD CONSTRAINT "atp_plans_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "atp_plans" ADD CONSTRAINT "atp_plans_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "atp_plans" ADD CONSTRAINT "atp_plans_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capaian_pembelajaran" ADD CONSTRAINT "capaian_pembelajaran_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capaian_pembelajaran" ADD CONSTRAINT "capaian_pembelajaran_source_document_id_curriculum_sources_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."curriculum_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capaian_pembelajaran" ADD CONSTRAINT "capaian_pembelajaran_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capaian_pembelajaran" ADD CONSTRAINT "capaian_pembelajaran_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_sources" ADD CONSTRAINT "curriculum_sources_uploaded_by_id_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_sources" ADD CONSTRAINT "curriculum_sources_verified_by_id_users_id_fk" FOREIGN KEY ("verified_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_versions" ADD CONSTRAINT "curriculum_versions_changed_by_id_users_id_fk" FOREIGN KEY ("changed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tp_prerequisites" ADD CONSTRAINT "tp_prerequisites_tp_id_tujuan_pembelajaran_id_fk" FOREIGN KEY ("tp_id") REFERENCES "public"."tujuan_pembelajaran"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tp_prerequisites" ADD CONSTRAINT "tp_prerequisites_prerequisite_tp_id_tujuan_pembelajaran_id_fk" FOREIGN KEY ("prerequisite_tp_id") REFERENCES "public"."tujuan_pembelajaran"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tujuan_pembelajaran" ADD CONSTRAINT "tujuan_pembelajaran_cp_id_capaian_pembelajaran_id_fk" FOREIGN KEY ("cp_id") REFERENCES "public"."capaian_pembelajaran"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tujuan_pembelajaran" ADD CONSTRAINT "tujuan_pembelajaran_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tujuan_pembelajaran" ADD CONSTRAINT "tujuan_pembelajaran_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tujuan_pembelajaran" ADD CONSTRAINT "tujuan_pembelajaran_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;