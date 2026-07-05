import z from "zod";

export const createFacilitySchema = z.object({
	name: z
		.string({ error: "Invalid facility name" })
		.trim()
		.nonempty({ error: "Facility name cannot be empty" })
		.max(256, {
			error: "Facility name length cannot exceed 256 characters",
		}),
});

export const updateFacilitySchema = z.object({
	name: z
		.string({ error: "Invalid facility name" })
		.trim()
		.nonempty({ error: "Facility name cannot be empty" })
		.max(256, {
			error: "Facility name length cannot exceed 256 characters",
		}),
});

export const facilityScopedSchema = z
	.object({
		id: z.coerce
			.number({ error: "Invalid facility ID" })
			.int({ error: "Invalid facility ID" }),
	})
	.strict();

export type CreateFacilitySchema = z.output<typeof createFacilitySchema>;
export type UpdateFacilitySchema = z.output<typeof updateFacilitySchema>;
