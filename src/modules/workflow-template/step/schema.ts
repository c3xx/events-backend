import z from "zod";

export const createWorkflowTemplateStepSchema = z
	.object({
		name: z
			.string({ error: "Invalid workflow template step name" })
			.trim()
			.min(3, { error: "Invalid workflow template step name" })
			.max(256, { error: "Invalid workflow template step name" }),
		previousStepId: z.coerce
			.number({ error: "Invalid previous workflow template step ID" })
			.int({ error: "Invalid previous workflow template step ID" })
			.nullish(),
	})
	.strict();

export type CreateWorkflowTemplateStepSchema = z.output<typeof createWorkflowTemplateStepSchema>;
