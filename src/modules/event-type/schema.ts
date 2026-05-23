import z from "zod";

export const createEventTypeSchema = z
	.object({
		name: z
			.string({ error: "Invalid name value" })
			.trim()
			.nonempty({ error: "Name cannot be empty" })
			.max(256, { error: "Name cannot exceed 256 characters" }),
		workflowTemplateId: z.coerce
			.number({ error: "Invalid workflow template ID" })
			.int({ error: "Invalid workflow template ID" }),
	})
	.strict();

export const eventTypeScopedSchema = z
	.object({
		id: z.coerce.number({ error: "Invalid event type ID" }).int({ error: "Invalid event type ID" }),
	})
	.strict();

export const allowedParentParamsSchema = z
	.object({
		id: z.coerce.number({ error: "Invalid event type ID" }).int({ error: "Invalid event type ID" }),
		childId: z.coerce
			.number({ error: "Invalid child event type ID" })
			.int({ error: "Invalid child event type ID" }),
	})
	.strict();

export type CreateEventTypeSchema = z.output<typeof createEventTypeSchema>;
export type AllowedParentParamsSchema = z.output<typeof allowedParentParamsSchema>;
