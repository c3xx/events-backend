import { NotFoundError } from "@/lib/errors.js";
import * as repository from "./repository.js";
import type { CreateVenueTypeSchema } from "./schema.js";

export async function getVenueTypes() {
	return await repository.getVenueTypes();
}

export async function getVenueType(venueTypeId: number) {
	const venueType = await repository.getVenueType(venueTypeId);
	if (venueType == null) throw new NotFoundError("Could not find the venue type");
	return venueType;
}

export async function createVenueType(input: CreateVenueTypeSchema) {
	return await repository.insertVenueType(input);
}
