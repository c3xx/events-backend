CREATE TYPE "public"."facility_association_method" AS ENUM('event', 'venue_allotment');--> statement-breakpoint
CREATE TYPE "public"."facility_overlap_policy" AS ENUM('shared', 'exclusive');--> statement-breakpoint
CREATE TYPE "public"."facility_provider_entity_type" AS ENUM('organization', 'venue');--> statement-breakpoint
CREATE TYPE "public"."facility_workflow_participation_policy" AS ENUM('include', 'exclude');--> statement-breakpoint
ALTER TYPE "public"."managed_entity_type" ADD VALUE 'facility';--> statement-breakpoint
CREATE TABLE "event_facility" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "event_facility_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"event_id" bigint NOT NULL,
	"facility_id" integer NOT NULL,
	"venue_allotment_id" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "facility_provider" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "facility_provider_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"facility_id" smallint NOT NULL,
	"provider_entity_type" "facility_provider_entity_type" NOT NULL,
	"provider_entity_ref_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "facility_type" (
	"id" smallint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "facility_type_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 32767 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "venue_facility" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "venue_facility" CASCADE;--> statement-breakpoint
DROP INDEX "facility_name_index";--> statement-breakpoint
ALTER TABLE "facility" ADD COLUMN "type_id" smallint NOT NULL;--> statement-breakpoint
ALTER TABLE "facility" ADD COLUMN "is_available" boolean NOT NULL;--> statement-breakpoint
ALTER TABLE "facility" ADD COLUMN "association" "facility_association_method" NOT NULL;--> statement-breakpoint
ALTER TABLE "facility" ADD COLUMN "workflow_participation_policy" "facility_workflow_participation_policy" NOT NULL;--> statement-breakpoint
ALTER TABLE "facility" ADD COLUMN "overlap_policy" "facility_overlap_policy" NOT NULL;--> statement-breakpoint
ALTER TABLE "event_facility" ADD CONSTRAINT "event_facility_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_facility" ADD CONSTRAINT "event_facility_facility_id_facility_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facility"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_facility" ADD CONSTRAINT "event_facility_venue_allotment_id_venue_allotment_id_fk" FOREIGN KEY ("venue_allotment_id") REFERENCES "public"."venue_allotment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facility_provider" ADD CONSTRAINT "facility_provider_facility_id_facility_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facility"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "facility_provider_facility_id_provider_entity_type_provider_entity_ref_id_index" ON "facility_provider" USING btree ("facility_id","provider_entity_type","provider_entity_ref_id") WHERE "facility_provider"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "facility_type_name_index" ON "facility_type" USING btree ("name") WHERE "facility_type"."deleted_at" is null;--> statement-breakpoint
ALTER TABLE "facility" ADD CONSTRAINT "facility_type_id_facility_type_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."facility_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "facility_name_index" ON "facility" USING btree ("name") WHERE "facility"."deleted_at" IS NULL;