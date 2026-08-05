DROP INDEX "workflow_instance_event_id_initial_step_id_index";--> statement-breakpoint
DROP INDEX "workflow_instance_event_id_index";--> statement-breakpoint
CREATE UNIQUE INDEX "workflow_instance_event_id_index" ON "workflow_instance" USING btree ("event_id") WHERE "workflow_instance"."deleted_at" IS NULL AND "workflow_instance"."status" = 'active';