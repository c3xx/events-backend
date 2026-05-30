import { NotFoundError } from "@/lib/errors.js";
import * as userRepository from "@/modules/user/repository.js";
import * as venueRepository from "@/modules/venue/repository.js";
import * as repository from "./repository.js";
import type * as schemas from "./schema.js";

export async function getVenueMembers(
	venueId: number,
	filters: schemas.GetVenueMembersQuerySchema,
) {
	const relatedManagedEntity = await venueRepository.findVenueManagedEntity(venueId);
	if (relatedManagedEntity == null) throw new NotFoundError("Could not find the venue");

	// ?email={$email}: Find member by email
	if (filters.email != null) {
		const user = await userRepository.findUserByEmail(filters.email);
		if (user == null) {
			throw new NotFoundError(`Could not find the user with email ${filters.email}`);
		} else {
			return await repository.getVenueMembers(relatedManagedEntity.id, {
				userId: user.id,
			});
		}
	}

	return await repository.getVenueMembers(relatedManagedEntity.id, {});
}

export async function addVenueMember(venueId: number, input: schemas.AddVenueMemberSchema) {
	const relatedManagedEntity = await venueRepository.findVenueManagedEntity(venueId);
	if (relatedManagedEntity == null) throw new NotFoundError("Could not find the venue");

	const user = await userRepository.findUserById(input.userId);
	if (user == null) throw new NotFoundError(`Could not find the user with ID ${input.userId}`);

	const assignedRoles = await repository.assignVenueMemberRoles({
		managedEntityId: relatedManagedEntity.id,
		roleIds: input.roleIds,
		userId: input.userId,
	});

	return assignedRoles;
}

export async function assignVenueMemberRoles(
	venueId: number,
	userId: number,
	input: schemas.AssignVenueMemberRolesSchema,
) {
	const relatedManagedEntity = await venueRepository.findVenueManagedEntity(venueId);
	if (relatedManagedEntity == null) throw new NotFoundError("Could not find the venue");

	const user = await userRepository.findUserById(userId);
	if (user == null) throw new NotFoundError(`Could not find the user with ID ${userId}`);

	const assignedRoles = await repository.assignVenueMemberRoles({
		managedEntityId: relatedManagedEntity.id,
		roleIds: input.roleIds,
		userId: userId,
	});

	return assignedRoles;
}

export async function deleteVenueMember(venueId: number, userId: number) {
	const relatedManagedEntity = await venueRepository.findVenueManagedEntity(venueId);
	if (relatedManagedEntity == null) throw new NotFoundError("Could not find the venue");

	const user = await userRepository.findUserById(userId);
	if (user == null) throw new NotFoundError(`Could not find the user with ID ${userId}`);

	const removedRoles = await repository.deleteVenueMember({
		managedEntityId: relatedManagedEntity.id,
		userId: userId,
	});

	return removedRoles;
}
