import { ok } from "@/lib/helpers.js";
import * as schemas from "./schema.js";
import * as service from "./service.js";

export const getVenueTypes: ApiRequestHandler<
	{
		id: number;
		name: string;
	}[]
> = async (_req, res) => {
	const result = await service.getVenueTypes();
	return ok(res, result);
};

export const createVenueType: ApiRequestHandler<{
	id: number;
}> = async (req, res) => {
	const body = schemas.createVenueTypeSchema.parse(req.body);
	const result = await service.createVenueType(body);
	return ok(res, result);
};

export const getVenueType: ApiRequestHandler<{
	id: number;
	name: string;
}> = async (req, res) => {
	const params = schemas.venueTypeScopedSchema.parse(req.params);
	const result = await service.getVenueType(params.id);
	return ok(res, result);
};
