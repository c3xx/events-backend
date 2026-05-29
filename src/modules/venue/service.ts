import { NotFoundError } from "@/lib/errors.js";
import * as repository from "./repository.js";
import type { CreateVenueSchema } from "./schema.js";

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
