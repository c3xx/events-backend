import { ok } from "@/lib/helpers.js";
import { createOrganizationTypeSchema, organizationTypeScopedSchema } from "./schema.js";
import * as service from "./service.js";

export const getOrganizationTypes: ApiRequestHandler<
	{
		id: number;
		name: string;
	}[]
> = async (_req, res) => {
	const result = await service.getOrganizationTypes();
	return ok(res, result);
};

export const createOrganizationType: ApiRequestHandler<{
	id: number;
}> = async (req, res) => {
	const body = createOrganizationTypeSchema.parse(req.body);
	const result = await service.createOrganizationType(body);
	return ok(res, result);
};

export const getOrganizationType: ApiRequestHandler<{
	id: number;
	name: string;
}> = async (req, res) => {
	const params = organizationTypeScopedSchema.parse(req.params);
	const result = await service.getOrganizationType(params.id);
	return ok(res, result);
};
