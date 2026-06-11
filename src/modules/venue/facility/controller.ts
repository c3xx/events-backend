import { ok } from "@/lib/helpers.js";
import { venueScopedSchema } from "@/modules/venue/schema.js";
import * as schemas from "./schema.js";
import * as service from "./service.js";

export const getVenueFacilities: ApiRequestHandler<
	{
		id: number;
		facilityId: number;
		facilityName: string;
	}[]
> = async (req, res) => {
	const params = venueScopedSchema.parse(req.params);
	const result = await service.getVenueFacilities(params.id);
	return ok(res, result);
};

export const setVenueFacilities: ApiRequestHandler<{ facilityId: number }[]> = async (req, res) => {
	const params = venueScopedSchema.parse(req.params);
	const body = schemas.setVenueFacilitiesSchema.parse(req.body);
	const result = await service.setVenueFacilities(params.id, body);
	return ok(res, result);
};
