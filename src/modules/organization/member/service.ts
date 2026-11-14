import { NotFoundError } from "@/lib/errors.js";
import * as userRepository from "@/modules/user/repository.js";
import type { OrganizationScope } from "../scopes.js";
import * as repository from "./repository.js";
import type * as schemas from "./schema.js";

export async function getOrganizationMembers(
	organization: OrganizationScope["organization"],
	filters: schemas.GetOrganizationMembersQuerySchema,
) {
	// ?email={$email}: Find member by email
	if (filters.email != null) {
		// todo: rewrite this shit code to just filter right in the db-action
		// itself instead of finding the user first. why? because, this
		// basically allows you to brute-force whether a user exists right in
		// the system or not.

		const user = await userRepository.findUserByEmail(filters.email);
		if (user == null) {
			throw new NotFoundError(`Could not find the user with email ${filters.email}`);
		} else {
			return await repository.getOrganizationMembers(organization.managedEntity.id, {
				userId: user.id,
			});
		}
	}

	return await repository.getOrganizationMembers(organization.managedEntity.id, {});
}

export async function addOrganizationMember(
	organization: OrganizationScope["organization"],
	input: schemas.AddOrganizationMemberSchema,
) {
	const user = await userRepository.findUserById(input.userId);
	if (user == null) throw new NotFoundError(`Could not find the user with ID ${input.userId}`);

	const assignedRoles = await repository.assignOrganizationMemberRoles({
		managedEntityId: organization.managedEntity.id,
		roleIds: input.roleIds,
		userId: input.userId,
	});

	return assignedRoles;
}

export async function assignOrganizationMemberRoles(
	organization: OrganizationScope["organization"],
	userId: number,
	input: schemas.AssignOrganizationMemberRolesSchema,
) {
	const user = await userRepository.findUserById(userId);
	if (user == null) throw new NotFoundError(`Could not find the user with ID ${userId}`);

	const assignedRoles = await repository.assignOrganizationMemberRoles({
		managedEntityId: organization.managedEntity.id,
		roleIds: input.roleIds,
		userId: userId,
	});

	return assignedRoles;
}

export async function deleteOrganizationMember(
	organization: OrganizationScope["organization"],
	userId: number,
) {
	const user = await userRepository.findUserById(userId);
	if (user == null) throw new NotFoundError(`Could not find the user with ID ${userId}`);

	const removedRoles = await repository.deleteOrganizationMember({
		managedEntityId: organization.managedEntity.id,
		userId: userId,
	});

	return removedRoles;
}
