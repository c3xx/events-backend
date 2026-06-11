CREATE TYPE "public"."event_organizer_invitation_status" AS ENUM('pending', 'accepted', 'rejected', 'revoked', 'expired');--> statement-breakpoint
CREATE TYPE "public"."event_organizer_role" AS ENUM('host', 'co_host');--> statement-breakpoint
CREATE TYPE "public"."event_status" AS ENUM('draft', 'pending', 'approved', 'cancelled', 'overridden');--> statement-breakpoint
CREATE TYPE "public"."event_type_collaboration_policy" AS ENUM('required', 'optional', 'forbidden');--> statement-breakpoint
CREATE TYPE "public"."event_type_venue_policy" AS ENUM('required', 'optional', 'forbidden');--> statement-breakpoint
CREATE TYPE "public"."managed_entity_type" AS ENUM('organization', 'venue');--> statement-breakpoint
CREATE TYPE "public"."user_type" AS ENUM('admin', 'end_user');--> statement-breakpoint
CREATE TYPE "public"."venue_access_level" AS ENUM('public', 'private');--> statement-breakpoint
CREATE TYPE "public"."workflow_instance_status" AS ENUM('active', 'completed', 'denied', 'aborted', 'overridden');--> statement-breakpoint
CREATE TYPE "public"."workflow_instance_step_assignment_status" AS ENUM('pending', 'approved', 'denied', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."workflow_instance_step_status" AS ENUM('pending', 'active', 'completed', 'skipped', 'blocked', 'denied', 'overridden');--> statement-breakpoint
CREATE TYPE "public"."workflow_target_group_approval_criteria" AS ENUM('all', 'any');--> statement-breakpoint
CREATE TABLE "event" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "event_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"title" text NOT NULL,
	"type_id" smallint NOT NULL,
	"category_id" smallint NOT NULL,
	"expected_participants" integer NOT NULL,
	"request_details" text NOT NULL,
	"status" "event_status" NOT NULL,
	"parent_event_id" bigint,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "chk_event__ends_after_starts" CHECK ("event"."ends_at" > "event"."starts_at"),
	CONSTRAINT "chk_event__min_participants" CHECK ("event"."expected_participants">0),
	CONSTRAINT "chk_event__unique_to_program" CHECK ("event"."parent_event_id" IS NULL OR "event"."parent_event_id" != "event"."id")
);
--> statement-breakpoint
CREATE TABLE "event_category" (
	"id" smallint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "event_category_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 32767 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "event_organizer" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "event_organizer_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"event_id" bigint NOT NULL,
	"organization_id" integer NOT NULL,
	"role" "event_organizer_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "event_organizer_invitation" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "event_organizer_invitation_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"event_id" bigint NOT NULL,
	"invited_at" timestamp with time zone DEFAULT now(),
	"invited_by_user_id" bigint NOT NULL,
	"sender_organization_id" integer NOT NULL,
	"recipient_organization_id" integer NOT NULL,
	"responded_by_user_id" bigint,
	"status" "event_organizer_invitation_status" DEFAULT 'pending' NOT NULL,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "chk_event_organizer_invitation__to_self" CHECK ("event_organizer_invitation"."sender_organization_id" !="event_organizer_invitation"."recipient_organization_id"),
	CONSTRAINT "chk_event_organizer_invitation__status_update" CHECK (
			("event_organizer_invitation"."status" = 'pending' AND "event_organizer_invitation"."closed_at" is NULL)
			OR
			("event_organizer_invitation"."status" IN ('accepted', 'rejected', 'revoked', 'expired') AND "event_organizer_invitation"."closed_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "event_report" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "event_report_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"event_id" bigint NOT NULL,
	"details" text NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "event_report_eventId_unique" UNIQUE("event_id")
);
--> statement-breakpoint
CREATE TABLE "event_type" (
	"id" smallint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "event_type_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 32767 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"workflow_template_id" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"venue_policy" "event_type_venue_policy" NOT NULL,
	"collaboration_policy" "event_type_collaboration_policy" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "event_type_allowed_parent" (
	"child_type_id" smallint NOT NULL,
	"parent_type_id" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_type_allowed_parent_child_type_id_parent_type_id_pk" PRIMARY KEY("child_type_id","parent_type_id")
);
--> statement-breakpoint
CREATE TABLE "facility" (
	"id" smallint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "facility_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 32767 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "managed_entity" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "managed_entity_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"managed_entity_type" "managed_entity_type" NOT NULL,
	"ref_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "organization_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"organization_type_id" smallint NOT NULL,
	"parent_organization_id" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "organization_type" (
	"id" smallint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "organization_type_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 32767 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "organization_type_allowed_parent" (
	"child_type_id" smallint NOT NULL,
	"parent_type_id" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_type_allowed_parent_child_type_id_parent_type_id_pk" PRIMARY KEY("child_type_id","parent_type_id")
);
--> statement-breakpoint
CREATE TABLE "permission" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "permission_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"code" text NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "permission_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "role" (
	"id" smallint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "role_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 32767 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"managed_entity_type" "managed_entity_type" NOT NULL,
	"type_ref_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "role_permission" (
	"permission_id" integer NOT NULL,
	"role_id" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "role_permission_role_id_permission_id_pk" PRIMARY KEY("role_id","permission_id")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"type" "user_type" NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "chk_user__email_must_belong_to_institution" CHECK ("user"."email" LIKE '%@tkmce.ac.in')
);
--> statement-breakpoint
CREATE TABLE "user_role" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_role_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" bigint NOT NULL,
	"role_id" smallint NOT NULL,
	"managed_entity_id" bigint NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "venue" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "venue_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"venue_type_id" smallint NOT NULL,
	"organization_id" integer,
	"access_level" "venue_access_level" NOT NULL,
	"is_available" boolean NOT NULL,
	"unavailability_reason" text,
	"max_capacity" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "chk_venue__unavailability_reason_presence" CHECK ("venue"."is_available" = (NULLIF("venue"."unavailability_reason", '') IS NULL))
);
--> statement-breakpoint
CREATE TABLE "venue_allotment" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "venue_allotment_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"venue_id" integer NOT NULL,
	"event_id" bigint NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "chk_venue_allotment__ends_after_starts" CHECK ("venue_allotment"."ends_at" > "venue_allotment"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "venue_facility" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "venue_facility_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"venue_id" integer NOT NULL,
	"facility_id" smallint NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "venue_facility_venueId_facilityId_unique" UNIQUE("venue_id","facility_id")
);
--> statement-breakpoint
CREATE TABLE "venue_type" (
	"id" smallint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "venue_type_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 32767 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "workflow_instance" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "workflow_instance_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"event_id" bigint NOT NULL,
	"initial_step_id" bigint,
	"status" "workflow_instance_status" NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "workflow_instance_step" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "workflow_instance_step_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"instance_id" bigint NOT NULL,
	"next_step_id" bigint,
	"status" "workflow_instance_step_status" NOT NULL,
	"name" text NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "workflow_instance_step_assignment" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "workflow_instance_step_assignment_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"target_group_id" bigint NOT NULL,
	"user_role_id" bigint NOT NULL,
	"status" "workflow_instance_step_assignment_status" NOT NULL,
	"remarks" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "workflow_instance_step_role" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "workflow_instance_step_role_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"step_id" bigint NOT NULL,
	"role_id" smallint NOT NULL,
	"target_group_approval_criteria" "workflow_target_group_approval_criteria" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "workflow_instance_step_target_group" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "workflow_instance_step_target_group_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"step_role_id" bigint NOT NULL,
	"managed_entity_id" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "workflow_template" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "workflow_template_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"initial_step_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "workflow_template_step" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "workflow_template_step_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"template_id" integer NOT NULL,
	"name" text NOT NULL,
	"next_step_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "workflow_template_step_role" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "workflow_template_step_role_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"step_id" integer NOT NULL,
	"role_id" smallint NOT NULL,
	"target_group_approval_criteria" "workflow_target_group_approval_criteria" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_type_id_event_type_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."event_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_category_id_event_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."event_category"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_parent_event_id_event_id_fk" FOREIGN KEY ("parent_event_id") REFERENCES "public"."event"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_organizer" ADD CONSTRAINT "event_organizer_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_organizer" ADD CONSTRAINT "event_organizer_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_organizer_invitation" ADD CONSTRAINT "event_organizer_invitation_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_organizer_invitation" ADD CONSTRAINT "event_organizer_invitation_invited_by_user_id_user_role_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."user_role"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_organizer_invitation" ADD CONSTRAINT "event_organizer_invitation_sender_organization_id_organization_id_fk" FOREIGN KEY ("sender_organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_organizer_invitation" ADD CONSTRAINT "event_organizer_invitation_recipient_organization_id_organization_id_fk" FOREIGN KEY ("recipient_organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_organizer_invitation" ADD CONSTRAINT "event_organizer_invitation_responded_by_user_id_user_role_id_fk" FOREIGN KEY ("responded_by_user_id") REFERENCES "public"."user_role"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_report" ADD CONSTRAINT "event_report_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_type" ADD CONSTRAINT "event_type_workflow_template_id_workflow_template_id_fk" FOREIGN KEY ("workflow_template_id") REFERENCES "public"."workflow_template"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_type_allowed_parent" ADD CONSTRAINT "event_type_allowed_parent_child_type_id_event_type_id_fk" FOREIGN KEY ("child_type_id") REFERENCES "public"."event_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_type_allowed_parent" ADD CONSTRAINT "event_type_allowed_parent_parent_type_id_event_type_id_fk" FOREIGN KEY ("parent_type_id") REFERENCES "public"."event_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization" ADD CONSTRAINT "organization_organization_type_id_organization_type_id_fk" FOREIGN KEY ("organization_type_id") REFERENCES "public"."organization_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization" ADD CONSTRAINT "organization_parent_organization_id_organization_id_fk" FOREIGN KEY ("parent_organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_type_allowed_parent" ADD CONSTRAINT "organization_type_allowed_parent_child_type_id_organization_type_id_fk" FOREIGN KEY ("child_type_id") REFERENCES "public"."organization_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_type_allowed_parent" ADD CONSTRAINT "organization_type_allowed_parent_parent_type_id_organization_type_id_fk" FOREIGN KEY ("parent_type_id") REFERENCES "public"."organization_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_permission_id_permission_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permission"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_role_id_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."role"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_role_id_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."role"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_managed_entity_id_managed_entity_id_fk" FOREIGN KEY ("managed_entity_id") REFERENCES "public"."managed_entity"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venue" ADD CONSTRAINT "venue_venue_type_id_venue_type_id_fk" FOREIGN KEY ("venue_type_id") REFERENCES "public"."venue_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venue" ADD CONSTRAINT "venue_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venue_allotment" ADD CONSTRAINT "venue_allotment_venue_id_venue_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venue"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venue_allotment" ADD CONSTRAINT "venue_allotment_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venue_facility" ADD CONSTRAINT "venue_facility_venue_id_venue_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venue"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venue_facility" ADD CONSTRAINT "venue_facility_facility_id_facility_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facility"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_instance" ADD CONSTRAINT "workflow_instance_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_instance" ADD CONSTRAINT "workflow_instance_initial_step_id_workflow_instance_step_id_fk" FOREIGN KEY ("initial_step_id") REFERENCES "public"."workflow_instance_step"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_instance_step" ADD CONSTRAINT "workflow_instance_step_instance_id_workflow_instance_id_fk" FOREIGN KEY ("instance_id") REFERENCES "public"."workflow_instance"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_instance_step" ADD CONSTRAINT "workflow_instance_step_next_step_id_workflow_instance_step_id_fk" FOREIGN KEY ("next_step_id") REFERENCES "public"."workflow_instance_step"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_instance_step_assignment" ADD CONSTRAINT "workflow_instance_step_assignment_target_group_id_workflow_instance_step_target_group_id_fk" FOREIGN KEY ("target_group_id") REFERENCES "public"."workflow_instance_step_target_group"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_instance_step_assignment" ADD CONSTRAINT "workflow_instance_step_assignment_user_role_id_user_role_id_fk" FOREIGN KEY ("user_role_id") REFERENCES "public"."user_role"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_instance_step_role" ADD CONSTRAINT "workflow_instance_step_role_step_id_workflow_instance_step_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."workflow_instance_step"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_instance_step_role" ADD CONSTRAINT "workflow_instance_step_role_role_id_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."role"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_instance_step_target_group" ADD CONSTRAINT "workflow_instance_step_target_group_step_role_id_workflow_instance_step_role_id_fk" FOREIGN KEY ("step_role_id") REFERENCES "public"."workflow_instance_step_role"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_instance_step_target_group" ADD CONSTRAINT "workflow_instance_step_target_group_managed_entity_id_managed_entity_id_fk" FOREIGN KEY ("managed_entity_id") REFERENCES "public"."managed_entity"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_template" ADD CONSTRAINT "workflow_template_initial_step_id_workflow_template_step_id_fk" FOREIGN KEY ("initial_step_id") REFERENCES "public"."workflow_template_step"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_template_step" ADD CONSTRAINT "workflow_template_step_template_id_workflow_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."workflow_template"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_template_step" ADD CONSTRAINT "workflow_template_step_next_step_id_workflow_template_step_id_fk" FOREIGN KEY ("next_step_id") REFERENCES "public"."workflow_template_step"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_template_step_role" ADD CONSTRAINT "workflow_template_step_role_step_id_workflow_template_step_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."workflow_template_step"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_template_step_role" ADD CONSTRAINT "workflow_template_step_role_role_id_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."role"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "event_category_name_index" ON "event_category" USING btree ("name") WHERE "event_category"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "event_organizer_event_id_organization_id_index" ON "event_organizer" USING btree ("event_id","organization_id") WHERE "event_organizer"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "event_organizer_invitation_event_id_recipient_organization_id_index" ON "event_organizer_invitation" USING btree ("event_id","recipient_organization_id") WHERE "event_organizer_invitation"."closed_at" IS NULL AND "event_organizer_invitation"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "event_type_name_index" ON "event_type" USING btree ("name") WHERE "event_type"."deleted_at" IS NULL AND "event_type"."is_active" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "facility_name_index" ON "facility" USING btree ("name") WHERE "facility"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "managed_entity_managed_entity_type_ref_id_index" ON "managed_entity" USING btree ("managed_entity_type","ref_id") WHERE "managed_entity"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "organization_organization_type_id_name_index" ON "organization" USING btree ("organization_type_id","name") WHERE "organization"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "organization_type_name_index" ON "organization_type" USING btree ("name") WHERE "organization_type"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "role_name_managed_entity_type_type_ref_id_index" ON "role" USING btree ("name","managed_entity_type","type_ref_id") WHERE "role"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "user_email_index" ON "user" USING btree ("email") WHERE "user"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "user_role_user_id_role_id_managed_entity_id_index" ON "user_role" USING btree ("user_id","role_id","managed_entity_id") WHERE "user_role"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "venue_venue_type_id_name_index" ON "venue" USING btree ("venue_type_id","name") WHERE "venue"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "venue_type_name_index" ON "venue_type" USING btree ("name") WHERE "venue_type"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "workflow_instance_event_id_initial_step_id_index" ON "workflow_instance" USING btree ("event_id","initial_step_id") WHERE "workflow_instance"."deleted_at" IS NULL AND "workflow_instance"."status" = 'active';--> statement-breakpoint
CREATE UNIQUE INDEX "workflow_instance_event_id_index" ON "workflow_instance" USING btree ("event_id") WHERE "workflow_instance"."deleted_at" IS NULL AND "workflow_instance"."status" = 'active' AND "workflow_instance"."initial_step_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "workflow_instance_step_unique_name" ON "workflow_instance_step" USING btree ("instance_id",lower("name")) WHERE "workflow_instance_step"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "workflow_instance_step_instance_id_next_step_id_index" ON "workflow_instance_step" USING btree ("instance_id","next_step_id") WHERE "workflow_instance_step"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "workflow_instance_step_assignment_target_group_id_user_role_id_index" ON "workflow_instance_step_assignment" USING btree ("target_group_id","user_role_id") WHERE "workflow_instance_step_assignment"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "workflow_instance_step_role_step_id_role_id_index" ON "workflow_instance_step_role" USING btree ("step_id","role_id") WHERE "workflow_instance_step_role"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "workflow_instance_step_target_group_step_role_id_managed_entity_id_index" ON "workflow_instance_step_target_group" USING btree ("step_role_id","managed_entity_id") WHERE "workflow_instance_step_target_group"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "workflow_template_unique_name" ON "workflow_template" USING btree (lower("name")) WHERE "workflow_template"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "workflow_template_initial_step_id_index" ON "workflow_template" USING btree ("initial_step_id") WHERE "workflow_template"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "workflow_template_step_unique_name" ON "workflow_template_step" USING btree ("template_id",lower("name")) WHERE "workflow_template_step"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "workflow_template_step_template_id_next_step_id_index" ON "workflow_template_step" USING btree ("template_id","next_step_id") WHERE "workflow_template_step"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "workflow_template_step_role_step_id_role_id_index" ON "workflow_template_step_role" USING btree ("step_id","role_id") WHERE "workflow_template_step_role"."deleted_at" IS NULL;