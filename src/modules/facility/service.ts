import { NotFoundError } from "@/lib/errors.js";
import * as repository from "./repository.js";
import type * as schemas from "./schema.js";

export async function getFacilities() {
	return await repository.findFacilities();
}

export async function createFacility(input: schemas.CreateFacilitySchema) {
	return await repository.insertFacility({ name: input.name });
}

export async function renameFacility(id: number, input: schemas.UpdateFacilitySchema) {
	const updated = await repository.updateFacility(id, { name: input.name });
	if (updated == null) throw new NotFoundError("Facility not found");
	return updated;
}

export async function deleteFacility(id: number) {
	const result = await repository.softDeleteFacility(id);
	if ((result.rowCount ?? 0) === 0) throw new NotFoundError("Facility not found");
}
