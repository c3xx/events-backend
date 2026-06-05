import { hashPassword } from "@/lib/argon2.js";
import { sendEmail } from "@/lib/email.js";
import { getAccountCreatedContent } from "@/lib/email-templates.js";
import { generateSecureString, quickEnv } from "@/lib/helpers.js";
import * as repository from "./repository.js";
import type { CreateUserSchema } from "./schema.js";

const frontendUrl = quickEnv("FRONTEND_ORIGIN", true);

export async function createUser(input: CreateUserSchema) {
	const placeholderPasswordHash = await hashPassword(generateSecureString());
	const user = await repository.insertUser({
		email: input.email,
		fullName: input.fullName,
		passwordHash: placeholderPasswordHash,
	});

	const setPasswordUrl = `${frontendUrl}/set-password`;
	const html = getAccountCreatedContent(setPasswordUrl);
	await sendEmail(input.email, "Your account has been created", html);

	return user;
}

export async function getUsers() {
	return await repository.getUsers();
}
