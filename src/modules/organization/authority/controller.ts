import { ok } from "@/lib/helpers.js";
import type { OrganizationAuthorityHolderScope, OrganizationScope } from "../scopes.js";
import * as schemas from "./schema.js";
import * as service from "./service.js";

export const getAllAuthorityHolders: ScopedApiRequestHandler<
	OrganizationScope,
	{
		id: number;
		name: string;
		type: {
			id: number;
			name: string;
		};
	}[]
> = async (_req, res) => {
	const result = await service.getAllAuthorityHolders(res.locals.organization);
	return ok(res, result);
};

export const createAuthorityHolder: ScopedApiRequestHandler<OrganizationScope, true> = async (
	req,
	res,
) => {
	const body = schemas.createAuthorityHolderSchema.parse(req.body);
	await service.createAuthorityHolder(res.locals.organization, body);
	return ok(res, true);
};

export const getAuthorityHolder: ScopedApiRequestHandler<
	OrganizationAuthorityHolderScope,
	{
		organization: {
			id: number;
			name: string;
			type: {
				id: number;
				name: string;
			};
		};
		permissions: {
			code: string;
			description: string;
		}[];
	}
> = async (_req, res) => {
	const result = await service.getAuthorityHolder(res.locals.authorityHolder);
	return ok(res, result);
};

export const removeAuthorityHolder: ScopedApiRequestHandler<
	OrganizationAuthorityHolderScope,
	true
> = async (_req, res) => {
	await service.removeAuthorityHolder(res.locals.authorityHolder);
	return ok(res, true);
};
