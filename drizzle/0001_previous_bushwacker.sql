CREATE TYPE "public"."event_organizer_invitation_role" AS ENUM('co_host');--> statement-breakpoint
CREATE TYPE "public"."password_token_type" AS ENUM('set_password', 'reset_password');--> statement-breakpoint
ALTER TYPE "public"."event_organizer_role" ADD VALUE 'resource_provider';--> statement-breakpoint
CREATE TABLE "user_password_token" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_password_token_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" bigint NOT NULL,
	"token_hash" text NOT NULL,
	"type" "password_token_type" NOT NULL,
	"used_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event_organizer" DROP CONSTRAINT "event_organizer_event_id_event_id_fk";
--> statement-breakpoint
ALTER TABLE "event_organizer" DROP CONSTRAINT "event_organizer_organization_id_organization_id_fk";
--> statement-breakpoint
ALTER TABLE "event_organizer_invitation" DROP CONSTRAINT "event_organizer_invitation_event_id_event_id_fk";
--> statement-breakpoint
ALTER TABLE "event_organizer_invitation" DROP CONSTRAINT "event_organizer_invitation_invited_by_user_id_user_role_id_fk";
--> statement-breakpoint
ALTER TABLE "event_organizer_invitation" DROP CONSTRAINT "event_organizer_invitation_sender_organization_id_organization_id_fk";
--> statement-breakpoint
ALTER TABLE "event_organizer_invitation" DROP CONSTRAINT "event_organizer_invitation_recipient_organization_id_organization_id_fk";
--> statement-breakpoint
ALTER TABLE "event_organizer_invitation" DROP CONSTRAINT "event_organizer_invitation_responded_by_user_id_user_role_id_fk";
--> statement-breakpoint
ALTER TABLE "event_report" DROP CONSTRAINT "event_report_event_id_event_id_fk";
--> statement-breakpoint
ALTER TABLE "venue_allotment" DROP CONSTRAINT "venue_allotment_venue_id_venue_id_fk";
--> statement-breakpoint
ALTER TABLE "venue_allotment" DROP CONSTRAINT "venue_allotment_event_id_event_id_fk";
--> statement-breakpoint
ALTER TABLE "event_organizer_invitation" ALTER COLUMN "invited_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "password_hash" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "created_by" bigint NOT NULL;--> statement-breakpoint
ALTER TABLE "event_organizer" ADD COLUMN "invitation_id" bigint;--> statement-breakpoint
ALTER TABLE "event_organizer_invitation" ADD COLUMN "intended_role" "event_organizer_invitation_role" NOT NULL;--> statement-breakpoint
ALTER TABLE "workflow_instance" ADD COLUMN "submitted_by" bigint NOT NULL;--> statement-breakpoint
ALTER TABLE "user_password_token" ADD CONSTRAINT "user_password_token_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_password_token_token_hash_index" ON "user_password_token" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "user_password_token_user_id_index" ON "user_password_token" USING btree ("user_id") WHERE "user_password_token"."used_at" IS NULL;--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_organizer" ADD CONSTRAINT "event_organizer_invitation_id_event_organizer_invitation_id_fk" FOREIGN KEY ("invitation_id") REFERENCES "public"."event_organizer_invitation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_organizer" ADD CONSTRAINT "event_organizer_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_organizer" ADD CONSTRAINT "event_organizer_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_organizer_invitation" ADD CONSTRAINT "event_organizer_invitation_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_organizer_invitation" ADD CONSTRAINT "event_organizer_invitation_invited_by_user_id_user_role_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."user_role"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_organizer_invitation" ADD CONSTRAINT "event_organizer_invitation_sender_organization_id_organization_id_fk" FOREIGN KEY ("sender_organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_organizer_invitation" ADD CONSTRAINT "event_organizer_invitation_recipient_organization_id_organization_id_fk" FOREIGN KEY ("recipient_organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_organizer_invitation" ADD CONSTRAINT "event_organizer_invitation_responded_by_user_id_user_role_id_fk" FOREIGN KEY ("responded_by_user_id") REFERENCES "public"."user_role"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_report" ADD CONSTRAINT "event_report_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venue_allotment" ADD CONSTRAINT "venue_allotment_venue_id_venue_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venue"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venue_allotment" ADD CONSTRAINT "venue_allotment_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_instance" ADD CONSTRAINT "workflow_instance_submitted_by_user_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;