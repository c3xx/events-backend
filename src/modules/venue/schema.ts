import z from "zod";
import { VENUE_ACCESS_LEVELS } from "@/lib/constants.js";

export const createVenueSchema = z
	.object({
		name: z
			.string({ error: "Invalid name value" })
			.trim()
			.nonempty({ error: "Name cannot be empty" })
			.max(256, { error: "Name cannot exceed 256 characters" }),
		venueTypeId: z.coerce
			.number({ error: "Invalid venue type ID" })
			.int({ error: "Invalid venue type ID" }),
		organizationId: z.coerce
			.number({ error: "Invalid organization ID" })
			.int({ error: "Invalid organization ID" })
			.nullish(), // note: never forget the power of nullish
		maxCapacity: z
			.int({ error: "Invalid capacity" })
			.positive({ error: "Capacity must be a positive integer" }),
		accessLevel: z.enum(VENUE_ACCESS_LEVELS, {
			error: "Venue must specify its access level",
		}),
		isAvailable: z.boolean({
			error: "Venue must specify whether it is available or not",
		}),
		unavailabilityReason: z
			.string({ error: "Invalid unavailability reason" })
			.trim()
			.nonempty({ error: "Invalid unavailability reason" })
			.max(512, { error: "Invalid unavailability reason" })
			.optional(),
	})
	.refine(
		(venue) =>
			(venue.isAvailable && venue.unavailabilityReason == null) ||
			(!venue.isAvailable &&
				venue.unavailabilityReason != null &&
				venue.unavailabilityReason.length > 0),
		{
			error: "Venue must have reason for its unavailability if marked unavailable",
		},
	)
	.strict();

export const venueScopedSchema = z
	.object({
		id: z.coerce.number({ error: "Invalid venue ID" }).int({ error: "Invalid venue ID" }),
	})
	.strict();

export const venueMemberScopedSchema = z
	.object({
		id: z.coerce.number({ error: "Invalid venue ID" }).int({ error: "Invalid venue ID" }),
		userId: z.coerce.number({ error: "Invalid user ID" }).int({ error: "Invalid user ID" }),
	})
	.strict();

export const getVenueMembersQuerySchema = z.object({
	email: z.string().optional(),
});

export const addVenueMemberSchema = z.object({
	userId: z.coerce.number({ error: "Invalid user ID" }).int({ error: "Invalid user ID" }),
	roleIds: z
		.array(z.coerce.number({ error: "Invalid role ID" }).int({ error: "Invalid role ID" }), {
			error: "Expected an array of role IDs",
		})
		.nonempty({ error: "Expected at least one role to be assigned to the user" }),
});

export const assignVenueMemberRolesSchema = z.object({
	roleIds: z
		.array(z.coerce.number({ error: "Invalid role ID" }).int({ error: "Invalid role ID" }), {
			error: "Expected an array of role IDs",
		})
		.nonempty({ error: "Expected at least one role to be assigned to the user" }),
});

export const setVenueFacilitiesSchema = z
	.object({
		facilityId: z.array(
			z.coerce.number({ error: "Invalid facility ID" }).int({ error: "Invalid facility ID" }),
			{ error: "Invalid set of facility IDs" },
		),
	})
	.strict();

export type CreateVenueSchema = z.output<typeof createVenueSchema>;
export type VenueScopedSchema = z.output<typeof venueScopedSchema>;
export type SetVenueFacilitiesSchema = z.output<typeof setVenueFacilitiesSchema>;
export type GetVenueMembersQuerySchema = z.output<typeof getVenueMembersQuerySchema>;
export type AddVenueMemberSchema = z.output<typeof addVenueMemberSchema>;
export type AssignVenueMemberRolesSchema = z.output<typeof assignVenueMemberRolesSchema>;
