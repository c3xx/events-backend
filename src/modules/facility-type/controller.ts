import { ok } from "@/lib/helpers.js";
import * as schemas from "./schema.js";
import * as service from "./service.js";

export const getFacilityTypes: ApiRequestHandler<
	{
		id: number;
		name: string;
	}[]
> = async (_req, res) => {
	const result = await service.getFacilityTypes();
	return ok(res, result);
};

export const createFacilityType: ApiRequestHandler<{
	id: number;
}> = async (req, res) => {
	const body = schemas.createFacilityTypeSchema.parse(req.body);
	const result = await service.createFacilityType(body);
	return ok(res, result);
};

export const getFacilityType: ApiRequestHandler<{
	id: number;
	name: string;
}> = async (req, res) => {
	const params = schemas.facilityTypeScopedSchema.parse(req.params);
	const result = await service.getFacilityType(params.id);
	return ok(res, result);
};
