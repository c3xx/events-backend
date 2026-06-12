import z from "zod";
import { idLike } from "@/lib/helpers.js";

export const workflowScopedSchema = z
	.object({
		workflowInstanceId: idLike("Invalid workflow instance ID"),
	})
	.strict();

export const workflowInstanceItemScopedSchema = z
	.object({
		id: idLike("Invalid workflow instance ID"),
	})
	.strict();

export type WorkflowScopedSchema = z.output<typeof workflowScopedSchema>;
export type WorkflowInstanceItemScopedSchema = z.output<typeof workflowInstanceItemScopedSchema>;
