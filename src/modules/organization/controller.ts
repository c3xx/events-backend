import { ok } from "@/lib/helpers.js";
import * as schemas from "./schema.js";
import type { OrganizationScope } from "./scopes.js";
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

export const getOrganization: ScopedApiRequestHandler<
	OrganizationScope,
	{
		id: number;
		name: string;
		isActive: boolean;
		createdAt: string;
		type: {
			id: number;
			name: string;
		};
		parentOrganization: {
			id: number;
			name: string;
			type: {
				id: number;
				name: string;
			};
		} | null;
		// todo: the following ids are legacy, remove once they are updated in frontend.
		organizationTypeId: number;
		parentOrganizationId: number | null;
	}
> = async (_req, res) => {
	const result = await service.getOrganization(res.locals.organization);
	return ok(res, result);
};
