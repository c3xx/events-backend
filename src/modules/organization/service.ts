import { NotFoundError } from "@/lib/errors.js";
import * as userRepository from "../user/repository.js";
import * as repository from "./repository.js";
import type {
	CreateOrganizationSchema,
	GetOrganizationMembersQuerySchema,
	AssignOrganizationMemberRolesSchema,
	AddOrganizationMemberSchema,
} from "./schema.js";

export async function createOrganization(input: CreateOrganizationSchema) {
	return await repository.createOrganization({
		name: input.name,
		organizationTypeId: input.organizationTypeId,
		parentOrganizationId: input.parentOrganizationId,
	});
}

export async function getOrganizations() {
	return await repository.getOrganizations();
}

export async function getOrganization(organizationId: number) {
	const organization = await repository.getOrganization(organizationId);
	if (organization == null) throw new NotFoundError("Could not find the organization");
	return organization;
}

export async function getOrganizationMembers(
	organizationId: number,
	filters: GetOrganizationMembersQuerySchema,
) {
	const relatedManagedEntity = await repository.findOrganizationManagedEntity(organizationId);
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
	input: AddOrganizationMemberSchema,
) {
	const relatedManagedEntity = await repository.findOrganizationManagedEntity(organizationId);
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
	input: AssignOrganizationMemberRolesSchema,
) {
	const relatedManagedEntity = await repository.findOrganizationManagedEntity(organizationId);
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
	const relatedManagedEntity = await repository.findOrganizationManagedEntity(organizationId);
	if (relatedManagedEntity == null) throw new NotFoundError("Could not find the organization");

	const user = await userRepository.findUserById(userId);
	if (user == null) throw new NotFoundError(`Could not find the user with ID ${userId}`);

	const removedRoles = await repository.deleteOrganizationMember({
		managedEntityId: relatedManagedEntity.id,
		userId: userId,
	});

	return removedRoles;
}
