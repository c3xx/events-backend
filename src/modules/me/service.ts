import * as userRepository from "../user/repository.js";

export async function getEventCreatableOrganizations(user: { id: number }) {
	return await userRepository.getUserOrganizations(user.id, "event:manage");
}
