import * as repository from "./repository.js";
import type * as schemas from "./schema.js";
import type { VenueScope } from "./scopes.js";

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

export async function getVenue(venue: VenueScope["venue"]) {
	return {
		id: venue.id,
		name: venue.name,
		type: {
			id: venue.type.id,
			name: venue.type.name,
		},
		maxCapacity: venue.maxCapacity,
		accessLevel: venue.accessLevel,
		isAvailable: venue.isAvailable,
		unavailabilityReason: venue.unavailabilityReason,

		organization:
			venue.organization != null
				? {
						id: venue.organization.id,
						name: venue.organization.name,
						//todo: should include a type as well.
					}
				: null,

		facilities: venue.facilities.map((facility) => {
			return {
				id: facility.id,
				name: facility.name,
				type: {
					id: facility.type.id,
					name: facility.type.name,
				},
				isAvailable: facility.isAvailable,
			};
		}),

		createdAt: venue.createdAt,
		isActive: venue.isActive,

		// deprecated
		venueTypeId: venue.venueTypeId,
	};
}
