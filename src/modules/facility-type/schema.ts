import z from "zod";
import { idLike } from "@/lib/helpers.js";

export const createFacilityTypeSchema = z
	.object({
		name: z
			.string({ error: "Invalid name type" })
			.trim() // note: do this everywhere where names are text is involved except for sensitive stuff
			.nonempty({ error: "Name must not be empty" })
			.max(256, { error: "Name cannot be longer than 256 characters" }),
	})
	.strict();

export const facilityTypeScopedSchema = z
	.object({
		id: idLike("Invalid facility type ID"),
	})
	.strict();

export type CreateFacilityTypeSchema = z.output<typeof createFacilityTypeSchema>;
export type FacilityTypeScopedSchema = z.output<typeof facilityTypeScopedSchema>;
