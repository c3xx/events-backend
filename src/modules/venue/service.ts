import { NotFoundError } from "@/lib/errors.js";
import * as repository from "./repository.js";
import type * as schemas from "./schema.js";

export async function createVenue(input: schemas.CreateVenueSchema) {
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

export async function updateVenue(id: number, input: schemas.UpdateVenueSchema) {
	const updated = await repository.updateVenue(id, {
		name: input.name,
		maxCapacity: input.maxCapacity,
		accessLevel: input.accessLevel,
		isAvailable: input.isAvailable,
		unavailabilityReason: input.isAvailable === true ? null : input.unavailabilityReason,
		isActive: input.isActive,
	});
	if (updated == null) throw new NotFoundError("Venue not found");
	return updated;
}

export async function deleteVenue(id: number) {
	const result = await repository.softDeleteVenue(id);
	if ((result.rowCount ?? 0) === 0) throw new NotFoundError("Venue not found");
}
