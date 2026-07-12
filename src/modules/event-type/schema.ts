import z from "zod";
import { EVENT_TYPE_COLLABORATION_POLICY, EVENT_TYPE_VENUE_POLICY } from "@/lib/constants.js";

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
		venuePolicy: z.enum(EVENT_TYPE_VENUE_POLICY, {
			error: "Event type must specify it's venue policy",
		}),
		collaborationPolicy: z.enum(EVENT_TYPE_COLLABORATION_POLICY, {
			error: "Event type must specify it's collaboration policy",
		}),
	})
	.strict();

export const updateEventTypeSchema = z
	.object({
		name: z
			.string({ error: "Invalid name value" })
			.trim()
			.nonempty({ error: "Name cannot be empty" })
			.max(256, { error: "Name cannot exceed 256 characters" })
			.optional(),
		isActive: z.boolean({ error: "isActive must be a boolean" }).optional(),
		venuePolicy: z
			.enum(EVENT_TYPE_VENUE_POLICY, { error: "Invalid venue policy" })
			.optional(),
		collaborationPolicy: z
			.enum(EVENT_TYPE_COLLABORATION_POLICY, { error: "Invalid collaboration policy" })
			.optional(),
		workflowTemplateId: z.coerce
			.number({ error: "Invalid workflow template ID" })
			.int({ error: "Invalid workflow template ID" })
			.optional(),
	})
	.strict()
	.refine(
		(d) =>
			d.name !== undefined ||
			d.isActive !== undefined ||
			d.venuePolicy !== undefined ||
			d.collaborationPolicy !== undefined ||
			d.workflowTemplateId !== undefined,
		{ error: "At least one field must be provided" },
	);

export const eventTypeScopedSchema = z
	.object({
		id: z.coerce.number({ error: "Invalid event type ID" }).int({ error: "Invalid event type ID" }),
	})
	.strict();

export type CreateEventTypeSchema = z.output<typeof createEventTypeSchema>;
export type UpdateEventTypeSchema = z.output<typeof updateEventTypeSchema>;
