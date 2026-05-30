import { ok } from "@/lib/helpers.js";
import * as schemas from "./schema.js";
import * as service from "./service.js";

export const createOrganization: ApiRequestHandler<{
	id: number;
}> = async (req, res) => {
	const body = schemas.createOrganizationSchema.parse(req.body);
	// todo: handle problems with unique and foregin constraints
	const result = await service.createOrganization(body);
	return ok(res, result, 201);
};

export const getOrganizations: ApiRequestHandler<
	{
		organizationTypeId: number;
		id: number;
		name: string;
		parentOrganizationId: number | null;
		isActive: boolean;
	}[]
> = async (_req, res) => {
	const result = await service.getOrganizations();
	return ok(res, result);
};

export const getOrganization: ApiRequestHandler<{
	organizationTypeId: number;
	id: number;
	name: string;
	parentOrganizationId: number | null;
	isActive: boolean;
}> = async (req, res) => {
	const params = schemas.organizationScopedSchema.parse(req.params);
	const result = await service.getOrganization(params.id);
	return ok(res, result);
};
