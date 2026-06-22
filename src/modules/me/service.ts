import { NotFoundError } from "@/lib/errors.js";
import * as userRepository from "@/modules/user/repository.js";

export async function getUserDetails(user: AuthenticatedUser): Promise<Frontend.AuthenticatedUser> {
	const details = await userRepository.getFullUser(user.id);
	if (details == null) throw new NotFoundError("User not found");
	return details;
}

export async function getEventCreatableOrganizations(user: AuthenticatedUser) {
	return await userRepository.getUserOrganizations(user.id, "event:manage");
}
