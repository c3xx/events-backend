import { BadRequestError, ConflictError } from "@/lib/errors.js";
import * as facilityTypeRepository from "@/modules/facility-type/repository.js";
import * as repository from "./repository.js";
import type * as schemas from "./schema.js";
import type { FacilityScope } from "./scopes.js";

export async function getFacilities() {
	const facilities = await repository.findFacilities({});
	return facilities;
}

export async function getEventAssociatedFacilities() {
	const facilities = await repository.findFacilities({
		association: "event",
	});
	return facilities;
}

export async function createFacility(input: schemas.CreateFacilitySchema) {
	const facilityType = await facilityTypeRepository.findFacilityTypeById(input.typeId);
	if (facilityType == null) throw new BadRequestError("Facility type not found");

	return await repository.insertFacility({
		name: input.name,
		typeId: input.typeId,
		association: input.association,
		overlapPolicy: input.overlapPolicy,
		workflowParticipationPolicy: input.workflowParticipationPolicy,
	});
}

export async function getFacility(facility: FacilityScope["facility"]) {
	return facility;
}

export async function changeAvailability(
	facility: FacilityScope["facility"],
	input: schemas.ChangeAvailabilitySchema,
) {
	if (facility.isAvailable === input.availability) return;
	if (input.availability === true && facility.providers.length === 0)
		throw new ConflictError("Cannot make a facility without providers available for assignment");

	await repository.changeAvailability(facility.id, { availability: input.availability });
}
