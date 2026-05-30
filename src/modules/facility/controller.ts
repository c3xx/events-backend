import { ok } from "@/lib/helpers.js";
import * as schemas from "./schema.js";
import * as service from "./service.js";

export const getFacilities: ApiRequestHandler<
	{
		id: number;
		name: string;
	}[]
> = async (_req, res) => {
	const result = await service.getFacilities();
	return ok(res, result);
};

export const createFacility: ApiRequestHandler<{
	id: number;
}> = async (req, res) => {
	const body = schemas.createFacilitySchema.parse(req.body);

	const result = await service.createFacility({
		name: body.name,
	});

	return ok(res, result);
};
