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
		organizationId: z.coerce
			.number({ error: "Invalid organization ID" })
			.int({ error: "Invalid organization ID" }),
		role: z.enum(["host", "co_host", "resource_provider"], { error: "Role must be a host, co_host, or resource_provider" }),
	})
	.strict();

export const updateEventOrganizerRoleSchema = z
	.object({
		role: z.enum(["host", "co_host", "resource_provider"], { error: "Role must be host, co_host, or resource_provider" }),
	})
	.strict();

export type EventOrganizerScopedSchema = z.output<typeof eventScopedSchema>;
export type OrganizerScopedSchema = z.output<typeof organizerScopedSchema>;
export type AddEventOrganizerSchema = z.output<typeof addEventOrganizerSchema>;
export type UpdateEventOrganizerRoleSchema = z.output<typeof updateEventOrganizerRoleSchema>;
