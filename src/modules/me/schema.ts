import z from "zod";
import { idLike } from "@/lib/helpers.js";

export const updateProfileSchema = z
	.object({
		fullName: z
			.string({ error: "Invalid full name value" })
			.trim()
			.nonempty({ error: "Full name cannot be empty" })
			.max(256, { error: "Full name cannot exceed 256 characters" }),
	})
	.strict();

export const getCalendarParamsSchema = z
	.object({
		start: z.coerce.date().optional(),
		next: z.coerce.number().int().positive().max(90),
		venueId: idLike("Invalid venue ID").optional(),
		status: z
			.string()
			.transform((val) => val.split(",").map((s) => s.trim()))
			.pipe(z.array(z.enum(["approved", "pending"]))),
	})
	.strict();

export type UpdateProfileSchema = z.output<typeof updateProfileSchema>;

export type GetCalendarParamsSchema = z.output<typeof getCalendarParamsSchema>;
