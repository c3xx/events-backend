import z from "zod";
import { INSTITUTION_DOMAIN } from "@/lib/constants.js";

export const loginSchema = z
	.object({
		email: z
			.email({ error: "Invalid email format" })
			.endsWith(INSTITUTION_DOMAIN, { error: "Expected institution domain email" }),
		password: z
			.string({ error: "Invalid password input" })
			.min(3, { error: "Password must be at least 3 characters" }),
	})
	.strict();

export type LoginSchema = z.output<typeof loginSchema>;

export const resetPasswordSchema = z
	.object({
		token: z.string({ error: "Token is required" }).trim().nonempty(),
		password: z
			.string({ error: "Invalid password input" })
			.min(6, { error: "Password must be at least 6 characters" }),
	})
	.strict();

export type ResetPasswordSchema = z.output<typeof resetPasswordSchema>;

export const validateTokenSchema = z
	.object({
		token: z.string({ error: "Token is required" }).trim().nonempty(),
	})
	.strict();

export type ValidateTokenSchema = z.output<typeof validateTokenSchema>;

export const requestPasswordTokenSchema = z
	.object({
		email: z
			.email({ error: "Invalid email format" })
			.endsWith(INSTITUTION_DOMAIN, { error: "Expected institution domain email" }),
		type: z.enum(["set_password", "reset_password"], {
			error: "type must be set_password or reset_password",
		}),
	})
	.strict();

export type RequestPasswordTokenSchema = z.output<typeof requestPasswordTokenSchema>;
