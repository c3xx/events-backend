import { NotFoundError } from "@/lib/errors.js";
import * as repository from "./repository.js";
import type * as schemas from "./schema.js";

export async function getFacilityTypes() {
	return await repository.getFacilityTypes();
}

export async function getFacilityType(facilityTypeId: number) {
	const facilityType = await repository.findFacilityTypeById(facilityTypeId);
	if (facilityType == null) throw new NotFoundError("Could not find the facility type");
	return facilityType;
}

export async function createFacilityType(input: schemas.CreateFacilityTypeSchema) {
	return await repository.insertFacilityType(input);
}
