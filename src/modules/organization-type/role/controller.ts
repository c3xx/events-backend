import { ok } from "@/lib/helpers.js";
import { organizationTypeScopedSchema } from "../schema.js";
import { createOrganizationTypeRoleSchema } from "./schema.js";
import * as service from "./service.js";

export const getOrganizationTypeRoles: ApiRequestHandler<
	{
		id: number;
		name: string;
	}[]
> = async (req, res) => {
	const params = organizationTypeScopedSchema.parse(req.params);
	const result = await service.getOrganizationTypeRoles(params.id);
	return ok(res, result);
};

export const createOrganizationTypeRole: ApiRequestHandler<{
	id: number;
}> = async (req, res) => {
	const params = organizationTypeScopedSchema.parse(req.params);
	const body = createOrganizationTypeRoleSchema.parse(req.body);

	const result = await service.createOrganizationTypeRole(params.id, body);
	return ok(res, result);
};
