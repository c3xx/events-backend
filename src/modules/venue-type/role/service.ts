import * as repository from "./repository.js";
import type { CreateVenueTypeRoleSchema } from "./schema.js";

export async function getVenueTypeRoles(venueTypeId: number) {
	return await repository.getVenueTypeRoles(venueTypeId);
}

export async function createVenueTypeRole(venueTypeId: number, input: CreateVenueTypeRoleSchema) {
	return await repository.createVenueTypeRole(venueTypeId, {
		name: input.name,
	});
}
