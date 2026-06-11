import z from "zod";
import { idLike } from "@/lib/helpers.js";
import { eventScopedSchema } from "@/modules/event/schema.js";

export const organizerScopedSchema = eventScopedSchema
	.extend({
		organizerId: idLike("Invalid organizer ID"),
	})
	.strict();

export const addEventOrganizerSchema = z
	.object({
		userRoleId: idLike("Invalid user role ID"),
		organizationId: idLike("Invalid organization ID"),
		intendedRole: z.enum(["co_host", "resource_provider"], {
			error: "Type must be either co_host or resource_provider",
		}),
	})
	.strict();

export type OrganizerScopedSchema = z.output<typeof organizerScopedSchema>;
export type AddEventOrganizerSchema = z.output<typeof addEventOrganizerSchema>;
