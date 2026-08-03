import * as repository from "./repository.js";
import type * as schemas from "./schema.js";

export async function getFacilityTypeRoles(facilityTypeId: number) {
	return await repository.getFacilityTypeRoles(facilityTypeId);
}

export async function createFacilityTypeRole(
	facilityTypeId: number,
	input: schemas.CreateFacilityTypeRoleSchema,
) {
	return await repository.createFacilityTypeRole(facilityTypeId, {
		name: input.name,
	});
}
