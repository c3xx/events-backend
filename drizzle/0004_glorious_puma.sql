CREATE TYPE "public"."organization_same_layer_control_policy" AS ENUM('allowed', 'disallowed');--> statement-breakpoint
CREATE TABLE "organization_hierarchy_layer" (
	"id" smallint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "organization_hierarchy_layer_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 32767 START WITH 1 CACHE 1),
	"label" text NOT NULL,
	"next_layer_id" smallint,
	"same_level_control_policy" "organization_same_layer_control_policy" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "layer_id" smallint NOT NULL;--> statement-breakpoint
ALTER TABLE "organization_hierarchy_layer" ADD CONSTRAINT "organization_hierarchy_layer_next_layer_id_organization_hierarchy_layer_id_fk" FOREIGN KEY ("next_layer_id") REFERENCES "public"."organization_hierarchy_layer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "organization_hierarchy_layer_unique_next_layer_id" ON "organization_hierarchy_layer" USING btree ("next_layer_id") WHERE "organization_hierarchy_layer"."next_layer_id" IS NULL AND "organization_hierarchy_layer"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "organization_hierarchy_layer_unique_label" ON "organization_hierarchy_layer" USING btree (lower("label")) WHERE "organization_hierarchy_layer"."deleted_at" IS NULL;--> statement-breakpoint
ALTER TABLE "organization" ADD CONSTRAINT "organization_layer_id_organization_hierarchy_layer_id_fk" FOREIGN KEY ("layer_id") REFERENCES "public"."organization_hierarchy_layer"("id") ON DELETE no action ON UPDATE no action;