import { hashPassword } from "@/lib/argon2.js";
import { generateSecureString } from "@/lib/helpers.js";
import * as repository from "./repository.js";
import type { CreateUserSchema } from "./schema.js";

export async function createUser(input: CreateUserSchema) {
	const initialPassword = generateSecureString();
	const user = await repository.insertUser(
		{
			email: input.email,
			fullName: input.fullName,
			passwordHash: await hashPassword(initialPassword),
		},
	);
	return user;
}

export async function getUsers() {
	return await repository.getUsers();
}
