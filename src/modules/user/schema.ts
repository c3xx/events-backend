import z from "zod";
import { INSTITUTION_DOMAIN } from "@/lib/constants.js";

export const createUserSchema = z
	.object({
		email: z.email({ error: "Invalid email" }).endsWith(INSTITUTION_DOMAIN, {
			error: "Email must belong to the institution",
		}),
		fullName: z
			.string({ error: "Invalid name input" })
			.trim()
			.nonempty({ error: "Name cannot be empty" })
			.max(256, { error: "Name cannot exceed 256 characters" }),
	})
	.strict();

export type CreateUserSchema = z.output<typeof createUserSchema>;
