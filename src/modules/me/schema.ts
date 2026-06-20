import z from "zod";

export const updateProfileSchema = z
	.object({
		fullName: z
			.string({ error: "Invalid full name value" })
			.trim()
			.nonempty({ error: "Full name cannot be empty" })
			.max(256, { error: "Full name cannot exceed 256 characters" }),
	})
	.strict();

export type UpdateProfileSchema = z.output<typeof updateProfileSchema>;
