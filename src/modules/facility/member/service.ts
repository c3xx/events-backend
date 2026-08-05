import { NotFoundError } from "@/lib/errors.js";
import * as facilityRepository from "@/modules/facility/repository.js";
import * as userRepository from "@/modules/user/repository.js";
import * as repository from "./repository.js";
import type * as schemas from "./schema.js";

export async function getFacilityMembers(
	facilityId: number,
	filters: schemas.GetFacilityMembersQuerySchema,
) {
	const relatedManagedEntity = await facilityRepository.findFacilityanagedEntity(facilityId);
	if (relatedManagedEntity == null) throw new NotFoundError("Could not find the facility");

	// ?email={$email}: Find member by email
	if (filters.email != null) {
		const user = await userRepository.findUserByEmail(filters.email);
		if (user == null) {
			throw new NotFoundError(`Could not find the user with email ${filters.email}`);
		} else {
			return await repository.getFacilityMembers(relatedManagedEntity.id, {
				userId: user.id,
			});
		}
	}

	return await repository.getFacilityMembers(relatedManagedEntity.id, {});
}

export async function addFacilityMember(
	facilityId: number,
	input: schemas.AddFacilityMemberSchema,
) {
	const relatedManagedEntity = await facilityRepository.findFacilityanagedEntity(facilityId);
	if (relatedManagedEntity == null) throw new NotFoundError("Could not find the facility");

	const user = await userRepository.findUserById(input.userId);
	if (user == null) throw new NotFoundError(`Could not find the user with ID ${input.userId}`);

	const assignedRoles = await repository.assignFacilityMemberRoles({
		managedEntityId: relatedManagedEntity.id,
		roleIds: input.roleIds,
		userId: input.userId,
	});

	return assignedRoles;
}

export async function assignFacilityMemberRoles(
	facilityId: number,
	userId: number,
	input: schemas.AssignFacilityMemberRolesSchema,
) {
	const relatedManagedEntity = await facilityRepository.findFacilityanagedEntity(facilityId);
	if (relatedManagedEntity == null) throw new NotFoundError("Could not find the facility");

	const user = await userRepository.findUserById(userId);
	if (user == null) throw new NotFoundError(`Could not find the user with ID ${userId}`);

	const assignedRoles = await repository.assignFacilityMemberRoles({
		managedEntityId: relatedManagedEntity.id,
		roleIds: input.roleIds,
		userId: userId,
	});

	return assignedRoles;
}

export async function deleteFacilityMember(facilityId: number, userId: number) {
	const relatedManagedEntity = await facilityRepository.findFacilityanagedEntity(facilityId);
	if (relatedManagedEntity == null) throw new NotFoundError("Could not find the facility");

	const user = await userRepository.findUserById(userId);
	if (user == null) throw new NotFoundError(`Could not find the user with ID ${userId}`);

	const removedRoles = await repository.deleteFacilityMember({
		managedEntityId: relatedManagedEntity.id,
		userId: userId,
	});

	return removedRoles;
}
