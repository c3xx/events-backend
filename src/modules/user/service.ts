import { NotFoundError } from "@/lib/errors.js";
import { sendEmail } from "@/lib/email.js";
import { getAccountCreatedContent } from "@/lib/email-templates.js";
import { env } from "@/lib/env.js";
import * as repository from "./repository.js";
import type * as schemas from "./schema.js";

export async function createUser(input: schemas.CreateUserSchema) {
	const user = await repository.insertUser({
		email: input.email,
		fullName: input.fullName,
	});

	const setPasswordUrl = `${env.FRONTEND_ORIGIN}/set-password`;
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

export async function updateUser(userId: number, input: schemas.UpdateUserSchema) {
	const updated = await repository.updateUserActiveStatus(userId, input.isActive);
	if (updated == null) throw new NotFoundError("User not found");
	return updated;
}

export async function deleteUser(userId: number) {
	const result = await repository.softDeleteUser(userId);
	if ((result.rowCount ?? 0) === 0) throw new NotFoundError("User not found");
}
