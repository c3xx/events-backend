import { ok } from "@/lib/helpers.js";
import * as schemas from "./schema.js";
import * as service from "./service.js";

export const createVenue: ApiRequestHandler<{
	id: number;
}> = async (req, res) => {
	const body = schemas.createVenueSchema.parse(req.body);
	const result = await service.createVenue(body);
	return ok(res, result, 201);
};

export const getVenues: ApiRequestHandler<
	{
		name: string;
		venueTypeId: number;
		organizationId: number | null;
		maxCapacity: number;
		accessLevel: VenueAccessLevel;
		isAvailable: boolean;
		unavailabilityReason: string | null;
		id: number;
		isActive: boolean;
	}[]
> = async (_req, res) => {
	const result = await service.getVenues();
	return ok(res, result);
};

export const getVenue: ApiRequestHandler<{
	name: string;
	venueTypeId: number;
	organizationId: number | null;
	maxCapacity: number;
	accessLevel: VenueAccessLevel;
	isAvailable: boolean;
	unavailabilityReason: string | null;
	id: number;
	createdAt: string;
	isActive: boolean;
}> = async (req, res) => {
	const params = schemas.venueScopedSchema.parse(req.params);
	const result = await service.getVenue(params.id);
	return ok(res, result);
};
