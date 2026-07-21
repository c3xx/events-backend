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

export const updateVenueSchema = z
	.object({
		name: z
			.string({ error: "Invalid name value" })
			.trim()
			.nonempty({ error: "Name cannot be empty" })
			.max(256, { error: "Name cannot exceed 256 characters" })
			.optional(),
		maxCapacity: z
			.int({ error: "Invalid capacity" })
			.positive({ error: "Capacity must be a positive integer" })
			.optional(),
		accessLevel: z
			.enum(VENUE_ACCESS_LEVELS, { error: "Venue must specify its access level" })
			.optional(),
		isAvailable: z.boolean({ error: "isAvailable must be a boolean" }).optional(),
		unavailabilityReason: z
			.string({ error: "Invalid unavailability reason" })
			.trim()
			.nonempty({ error: "Invalid unavailability reason" })
			.max(512, { error: "Invalid unavailability reason" })
			.nullable()
			.optional(),
		isActive: z.boolean({ error: "isActive must be a boolean" }).optional(),
	})
	.strict()
	.refine((data) => Object.values(data).some((v) => v !== undefined), {
		error: "At least one field must be provided",
	})
	.refine(
		(data) => {
			if (data.isAvailable === false)
				return data.unavailabilityReason != null && data.unavailabilityReason.length > 0;
			return true;
		},
		{ error: "A reason must be provided when marking a venue as unavailable" },
	);

export type CreateVenueSchema = z.output<typeof createVenueSchema>;
export type VenueScopedSchema = z.output<typeof venueScopedSchema>;
export type UpdateVenueSchema = z.output<typeof updateVenueSchema>;
