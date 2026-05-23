import { NotFoundError } from "@/lib/errors.js";
import * as userRepository from "../user/repository.js";
import * as repository from "./repository.js";
import type {
	AddVenueMemberSchema,
	AssignVenueMemberRolesSchema,
	CreateVenueSchema,
	GetVenueMembersQuerySchema,
	SetVenueFacilitiesSchema,
} from "./schema.js";

export async function createVenue(input: CreateVenueSchema) {
	return await repository.createVenue({
		name: input.name,
		accessLevel: input.accessLevel,
		isAvailable: input.isAvailable,
		maxCapacity: input.maxCapacity,
		venueTypeId: input.venueTypeId,
		organizationId: input.organizationId,
		unavailabilityReason: input.unavailabilityReason,
	});
}

export async function getVenues() {
	return await repository.getVenues();
}

export async function getVenue(venueId: number) {
	const venue = await repository.getVenue(venueId);
	if (venue == null) throw new NotFoundError("Could not find the venue");
	return venue;
}

export async function getVenueMembers(venueId: number, filters: GetVenueMembersQuerySchema) {
	const relatedManagedEntity = await repository.findVenueManagedEntity(venueId);
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

export async function addVenueMember(venueId: number, input: AddVenueMemberSchema) {
	const relatedManagedEntity = await repository.findVenueManagedEntity(venueId);
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
	input: AssignVenueMemberRolesSchema,
) {
	const relatedManagedEntity = await repository.findVenueManagedEntity(venueId);
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
	const relatedManagedEntity = await repository.findVenueManagedEntity(venueId);
	if (relatedManagedEntity == null) throw new NotFoundError("Could not find the venue");

	const user = await userRepository.findUserById(userId);
	if (user == null) throw new NotFoundError(`Could not find the user with ID ${userId}`);

	const removedRoles = await repository.deleteVenueMember({
		managedEntityId: relatedManagedEntity.id,
		userId: userId,
	});

	return removedRoles;
}

export async function getVenueFacilities(venueId: number) {
	return await repository.getVenueFacilities(venueId);
}

export async function setVenueFacilities(venueId: number, input: SetVenueFacilitiesSchema) {
	if (input.facilityId.length === 0) {
		await repository.deleteAllVenueFacilities(venueId);
		return [];
	}

	return await repository.setVenueFacilities(venueId, {
		facilityIds: input.facilityId,
	});
}
