import { ok } from "@/lib/helpers.js";
import { venueTypeScopedSchema } from "@/modules/venue-type/schema.js";
import * as schemas from "./schema.js";
import * as service from "./service.js";

export const getVenueTypeRoles: ApiRequestHandler<
	{
		id: number;
		name: string;
	}[]
> = async (req, res) => {
	const params = venueTypeScopedSchema.parse(req.params);
	const result = await service.getVenueTypeRoles(params.id);
	return ok(res, result);
};

export const createVenueTypeRole: ApiRequestHandler<{
	id: number;
}> = async (req, res) => {
	const params = venueTypeScopedSchema.parse(req.params);
	const body = schemas.createVenueTypeRoleSchema.parse(req.body);
	const result = await service.createVenueTypeRole(params.id, body);
	return ok(res, result);
};
