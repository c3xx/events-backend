import z from "zod";

export const createWorkflowTemplateSchema = z.object({
	name: z
		.string({ error: "Invalid workflow template name" })
		.trim()
		.min(3, { error: "Invalid workflow template name" })
		.max(256, { error: "Invalid workflow template name" }),
});

export type CreateWorkflowTemplateSchema = z.output<typeof createWorkflowTemplateSchema>;
