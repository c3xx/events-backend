import { ok } from "@/lib/helpers.js";
import { facilityTypeScopedSchema } from "@/modules/facility-type/schema.js";
import * as schemas from "./schema.js";
import * as service from "./service.js";

export const getFacilityTypeRoles: ApiRequestHandler<
	{
		id: number;
		name: string;
	}[]
> = async (req, res) => {
	const params = facilityTypeScopedSchema.parse(req.params);
	const result = await service.getFacilityTypeRoles(params.id);
	return ok(res, result);
};

export const createFacilityTypeRole: ApiRequestHandler<{
	id: number;
}> = async (req, res) => {
	const params = facilityTypeScopedSchema.parse(req.params);
	const body = schemas.createFacilityTypeRoleSchema.parse(req.body);
	const result = await service.createFacilityTypeRole(params.id, body);
	return ok(res, result);
};
