import { FRONTEND_ORIGIN } from "@/lib/constants.js";
import { sendEmail } from "@/lib/email.js";
import { getAccountCreatedContent } from "@/lib/email-templates.js";
import * as repository from "./repository.js";
import type * as schemas from "./schema.js";

export async function createUser(input: schemas.CreateUserSchema) {
	const user = await repository.insertUser({
		email: input.email,
		fullName: input.fullName,
	});

	const setPasswordUrl = `${FRONTEND_ORIGIN}/set-password`;
	const html = getAccountCreatedContent(setPasswordUrl);
	await sendEmail({
		to: [input.email],
		subject: "Your account has been created",
		html: html,
	});

	return user;
}

export async function getUsers() {
	return await repository.getUsers();
}
