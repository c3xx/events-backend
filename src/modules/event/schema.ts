import z from "zod";
import { EVENT_STATUS } from "@/lib/constants.js";

export const createEventSchema = z
	.object({
		organizationId: z.coerce
			.number({ error: "Invalid organization ID" })
			.int({ error: "Invalid organization ID" }),
		title: z
			.string({ error: "Invalid title value" })
			.trim()
			.nonempty({ error: "Title cannot be empty" })
			.max(256, { error: "Title cannot exceed 256 characters" }),
		typeId: z.coerce
			.number({ error: "Invalid event type ID" })
			.int({ error: "Invalid event type ID" }),
		categoryId: z.coerce
			.number({ error: "Invalid category ID" })
			.int({ error: "Invalid category ID" }),
		expectedParticipants: z.coerce
			.number({ error: "Invalid expected participants count" })
			.int({ error: "Invalid expected participants count" })
			.positive({ error: "Expected participants must be positive" }),
		requestDetails: z
			.string({ error: "Invalid request details" })
			.trim()
			.nonempty({ error: "Request details cannot be empty" }),
		parentEventId: z.coerce
			.number({ error: "Invalid parent event ID" })
			.int({ error: "Invalid parent event ID" })
			.nullish(),
		startsAt: z.iso.datetime({ offset: true, error: "Invalid start time format" }),
		endsAt: z.iso.datetime({ offset: true, error: "Invalid end time format" }),
	})
	.refine((d) => new Date(d.startsAt) < new Date(d.endsAt), {
		error: "Event cannot end before it starts",
	})
	.strict();

export const eventScopedSchema = z
	.object({
		eventId: z.coerce.number({ error: "Invalid event ID" }).int({ error: "Invalid event ID" }),
	})
	.strict();

export const getEventsQuerySchema = z
	.object({
		status: z
			.string()
			.transform((val) => val.split(",").map((s) => s.trim()))
			.pipe(z.array(z.enum(EVENT_STATUS))),
		typeId: z.coerce.number().int({ error: "Invalid event type ID" }),
	})
	.partial();

export const updateEventSchema = z
	.object({
		title: z
			.string({ error: "Invalid title value" })
			.trim()
			.nonempty({ error: "Title cannot be empty" })
			.max(256, { error: "Title cannot exceed 256 characters" }),
		typeId: z.coerce
			.number({ error: "Invalid event type ID" })
			.int({ error: "Invalid event type ID" }),
		categoryId: z.coerce
			.number({ error: "Invalid category ID" })
			.int({ error: "Invalid category ID" }),
		expectedParticipants: z.coerce
			.number({ error: "Invalid expected participants count" })
			.int({ error: "Invalid expected participants count" })
			.positive({ error: "Expected participants must be positive" }),
		requestDetails: z
			.string({ error: "Invalid request details" })
			.trim()
			.nonempty({ error: "Request details cannot be empty" }),
		parentEventId: z.coerce
			.number({ error: "Invalid parent event ID" })
			.int({ error: "Invalid parent event ID" })
			.nullish(),
		startsAt: z.iso.datetime({ offset: true, error: "Invalid start time format" }),
		endsAt: z.iso.datetime({ offset: true, error: "Invalid end time format" }),
	})
	.partial()
	.refine(
		(d) => {
			if (d.startsAt && d.endsAt) {
				return new Date(d.startsAt) < new Date(d.endsAt);
			}
			return true;
		},
		{
			error: "Event cannot end before it starts",
		},
	);

export type CreateEventSchema = z.output<typeof createEventSchema>;
export type GetEventsQuerySchema = z.output<typeof getEventsQuerySchema>;
export type UpdateEventSchema = z.output<typeof updateEventSchema>;
export type EventScopedSchema = z.output<typeof eventScopedSchema>;
