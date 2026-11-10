CREATE TYPE "public"."permission_type" AS ENUM('user', 'managed_entity_authority');--> statement-breakpoint
CREATE TABLE "managed_entity_authority" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "managed_entity_authority_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"holder_type" "managed_entity_type" NOT NULL,
	"holder_ref_id" integer NOT NULL,
	"subject_type" "managed_entity_type" NOT NULL,
	"subject_ref_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "managed_entity_authority_permission" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "managed_entity_authority_permission_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"authority_id" bigint NOT NULL,
	"permission_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "managed_entity_authority_permission_authorityId_permissionId_unique" UNIQUE("authority_id","permission_id")
);
--> statement-breakpoint
ALTER TABLE "permission" DROP CONSTRAINT "permission_code_unique";--> statement-breakpoint
ALTER TABLE "permission" ADD COLUMN "type" "permission_type" NOT NULL;--> statement-breakpoint
ALTER TABLE "managed_entity_authority_permission" ADD CONSTRAINT "managed_entity_authority_permission_authority_id_managed_entity_authority_id_fk" FOREIGN KEY ("authority_id") REFERENCES "public"."managed_entity_authority"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "managed_entity_authority_permission" ADD CONSTRAINT "managed_entity_authority_permission_permission_id_permission_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permission"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "managed_entity_authority_holder_type_holder_ref_id_subject_type_subject_ref_id_index" ON "managed_entity_authority" USING btree ("holder_type","holder_ref_id","subject_type","subject_ref_id") WHERE "managed_entity_authority"."deleted_at" IS NULL;--> statement-breakpoint
ALTER TABLE "permission" ADD CONSTRAINT "permission_type_code_unique" UNIQUE("type","code");