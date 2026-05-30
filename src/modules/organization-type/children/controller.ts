import { ok } from "@/lib/helpers.js";
import { organizationTypeScopedSchema } from "@/modules/organization-type/schema.js";
import * as schemas from "./schema.js";
import * as service from "./service.js";

export const getOrganizationTypeChildTypes: ApiRequestHandler<
	{
		id: number;
		name: string;
	}[]
> = async (req, res) => {
	const params = organizationTypeScopedSchema.parse(req.params);
	const result = await service.getOrganizationTypeChildTypes(params.id);
	return ok(res, result);
};

export const addAllowedChildType: ApiRequestHandler<{
	parentTypeId: number;
	childTypeId: number;
}> = async (req, res) => {
	const params = schemas.addAllowedParentParamsSchema.parse(req.params);
	const result = await service.addAllowedChildType(params);
	return ok(res, result);
};
