import * as repository from "./repository.js";
import type { SetVenueFacilitiesSchema } from "./schema.js";

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
