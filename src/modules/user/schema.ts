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

export const updateUserSchema = z
	.object({
		isActive: z.boolean({ error: "isActive must be a boolean" }),
	})
	.strict();

export const userScopedSchema = z
	.object({
		userId: z.coerce.number({ error: "Invalid user ID" }).int({ error: "Invalid user ID" }),
	})
	.strict();

export type UpdateUserSchema = z.output<typeof updateUserSchema>;
export type UserScopedSchema = z.output<typeof userScopedSchema>;
