import { NotFoundError } from "@/lib/errors.js";
import * as organizationRepository from "@/modules/organization/repository.js";
import * as userRepository from "@/modules/user/repository.js";
import * as repository from "./repository.js";
import type * as schemas from "./schema.js";

export async function getOrganizationMembers(
	organizationId: number,
	filters: schemas.GetOrganizationMembersQuerySchema,
) {
	const relatedManagedEntity =
		await organizationRepository.findOrganizationManagedEntity(organizationId);
	if (relatedManagedEntity == null) throw new NotFoundError("Could not find the organization");

	// ?email={$email}: Find member by email
	if (filters.email != null) {
		const user = await userRepository.findUserByEmail(filters.email);
		if (user == null) {
			throw new NotFoundError(`Could not find the user with email ${filters.email}`);
		} else {
			return await repository.getOrganizationMembers(relatedManagedEntity.id, {
				userId: user.id,
			});
		}
	}

	return await repository.getOrganizationMembers(relatedManagedEntity.id, {});
}

export async function addOrganizationMember(
	organizationId: number,
	input: schemas.AddOrganizationMemberSchema,
) {
	const relatedManagedEntity =
		await organizationRepository.findOrganizationManagedEntity(organizationId);
	if (relatedManagedEntity == null) throw new NotFoundError("Could not find the organization");

	const user = await userRepository.findUserById(input.userId);
	if (user == null) throw new NotFoundError(`Could not find the user with ID ${input.userId}`);

	const assignedRoles = await repository.assignOrganizationMemberRoles({
		managedEntityId: relatedManagedEntity.id,
		roleIds: input.roleIds,
		userId: input.userId,
	});

	return assignedRoles;
}

export async function assignOrganizationMemberRoles(
	organizationId: number,
	userId: number,
	input: schemas.AssignOrganizationMemberRolesSchema,
) {
	const relatedManagedEntity =
		await organizationRepository.findOrganizationManagedEntity(organizationId);
	if (relatedManagedEntity == null) throw new NotFoundError("Could not find the organization");

	const user = await userRepository.findUserById(userId);
	if (user == null) throw new NotFoundError(`Could not find the user with ID ${userId}`);

	const assignedRoles = await repository.assignOrganizationMemberRoles({
		managedEntityId: relatedManagedEntity.id,
		roleIds: input.roleIds,
		userId: userId,
	});

	return assignedRoles;
}

export async function deleteOrganizationMember(organizationId: number, userId: number) {
	const relatedManagedEntity =
		await organizationRepository.findOrganizationManagedEntity(organizationId);
	if (relatedManagedEntity == null) throw new NotFoundError("Could not find the organization");

	const user = await userRepository.findUserById(userId);
	if (user == null) throw new NotFoundError(`Could not find the user with ID ${userId}`);

	const removedRoles = await repository.deleteOrganizationMember({
		managedEntityId: relatedManagedEntity.id,
		userId: userId,
	});

	return removedRoles;
}
