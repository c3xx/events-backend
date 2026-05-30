import { hashPassword } from "@/lib/argon2.js";
import * as repository from "./repository.js";
import type * as schemas from "./schema.js";

export async function createUser(input: schemas.CreateUserSchema) {
	return await repository.insertUser({
		email: input.email,
		fullName: input.fullName,
		passwordHash: await hashPassword(input.password),
	});
}

export async function getUsers() {
	return await repository.getUsers();
}
