import z from "zod";

export const createVenueTypeSchema = z
	.object({
		name: z
			.string({ error: "Invalid name type" })
			.trim() // note: do this everywhere where names are text is involved except for sensitive stuff
			.nonempty({ error: "Name must not be empty" })
			.max(256, { error: "Name cannot be longer than 256 characters" }),
	})
	.strict();

export const venueTypeScopedSchema = z
	.object({
		id: z.coerce.number({ error: "Invalid venue type ID" }).int({ error: "Invalid venue type ID" }),
	})
	.strict();

export type CreateVenueTypeSchema = z.output<typeof createVenueTypeSchema>;
export type VenueTypeScopedSchema = z.output<typeof venueTypeScopedSchema>;
