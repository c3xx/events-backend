import z from "zod";
import { idLike } from "@/lib/helpers.js";

export const createWorkflowTemplateStepSchema = z
	.object({
		name: z
			.string({ error: "Invalid workflow template step name" })
			.trim()
			.min(3, { error: "Invalid workflow template step name" })
			.max(256, { error: "Invalid workflow template step name" }),
		previousStepId: idLike("Invalid previous workflow template step ID").nullish(),
	})
	.strict();

export type CreateWorkflowTemplateStepSchema = z.output<typeof createWorkflowTemplateStepSchema>;
