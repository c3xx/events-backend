import { ok } from "@/lib/helpers.js";
import type { VenueAuthorityHolderScope, VenueScope } from "../scopes.js";
import * as schemas from "./schema.js";
import * as service from "./service.js";

export const getAllAuthorityHolders: ScopedApiRequestHandler<
	VenueScope,
	{
		id: IdLike;
		scope: {
			type: ManagedEntityType;
			id: IdLike;
			name: string;
			kind: {
				id: IdLike;
				name: string;
			};
		};
	}[]
> = async (_req, res) => {
	const result = await service.getAllAuthorityHolders(res.locals.venue);
	return ok(res, result);
};

export const createAuthorityHolder: ScopedApiRequestHandler<VenueScope, true> = async (
	req,
	res,
) => {
	const body = schemas.createAuthorityHolderSchema.parse(req.body);
	await service.createAuthorityHolder(res.locals.venue, body);
	return ok(res, true);
};

export const getAuthorityHolder: ScopedApiRequestHandler<
	VenueAuthorityHolderScope,
	{
		id: IdLike;
		scope: {
			type: ManagedEntityType;
			id: IdLike;
			name: string;
			kind: {
				id: IdLike;
				name: string;
			};
		};
		permissions: {
			code: AuthorityPermissionCode;
			description: string;
		}[];
	}
> = async (_req, res) => {
	const result = await service.getAuthorityHolder(res.locals.authorityHolder);
	return ok(res, result);
};

export const removeAuthorityHolder: ScopedApiRequestHandler<
	VenueAuthorityHolderScope,
	true
> = async (_req, res) => {
	await service.removeAuthorityHolder(res.locals.venue, res.locals.authorityHolder);
	return ok(res, true);
};
