import z from "zod";

export const eventScopedSchema = z
	.object({
		eventId: z.coerce.number({ error: "Invalid event ID" }).int({ error: "Invalid event ID" }),
	})
	.strict();

export const organizerScopedSchema = z
	.object({
		eventId: z.coerce.number({ error: "Invalid event ID" }).int({ error: "Invalid event ID" }),
		organizerId: z.coerce
			.number({ error: "Invalid organizer ID" })
			.int({ error: "Invalid organizer ID" }),
	})
	.strict();

export const addEventOrganizerSchema = z
	.object({
		userRoleId: z.coerce
			.number({ error: "Invalid user role ID" })
			.int({ error: "Invalid user role ID" }),

		organizationId: z.coerce
			.number({ error: "Invalid organization ID" })
			.int({ error: "Invalid organization ID" }),
	})
	.strict();

export const removeEventOrganizerSchema = z
	.object({
		userRoleId: z.coerce // CHANGED: added
			.number({ error: "Invalid user role ID" })
			.int({ error: "Invalid user role ID" }),
	})
	.strict();

export type EventOrganizerScopedSchema = z.output<typeof eventScopedSchema>;
export type OrganizerScopedSchema = z.output<typeof organizerScopedSchema>;
export type AddEventOrganizerSchema = z.output<typeof addEventOrganizerSchema>;
export type RemoveEventOrganizerSchema = z.output<typeof removeEventOrganizerSchema>;
