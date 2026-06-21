import { NotFoundError } from "@/lib/errors.js";
import * as userRepository from "@/modules/user/repository.js";
import type * as schemas from "./schema.js";

export async function getUserDetails(userId: number): Promise<Frontend.AuthenticatedUser> {
	const user = await userRepository.getFullUser(userId);
	if (user == null) throw new NotFoundError("User not found");
	return user;
}

export async function getEventCreatableOrganizations(user: { id: number }) {
	return await userRepository.getUserOrganizations(user.id, "event:manage");
}

export async function updateProfile(userId: number, input: schemas.UpdateProfileSchema) {
	const result = await userRepository.updateUser(userId, { fullName: input.fullName });
	if (result == null) {
		throw new NotFoundError("User not found");
	}
	return { id: result.id };
}
