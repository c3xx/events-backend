import { ok } from "@/lib/helpers.js";
import type { VenueAuthorityHolderScope } from "../../scopes.js";
import * as schemas from "./schema.js";
import * as service from "./service.js";

export const getAuthorityHolderPermissions: ScopedApiRequestHandler<
	VenueAuthorityHolderScope,
	{ code: AuthorityPermissionCode; description: string }[]
> = async (_req, res) => {
	const result = await service.getAuthorityHolderPermissions(res.locals.authorityHolder);
	return ok(res, result);
};

export const assignPermissionToAuthorityHolder: ScopedApiRequestHandler<
	VenueAuthorityHolderScope,
	true
> = async (req, res) => {
	const body = schemas.permissionCodeInputSchema.parse(req.body);
	await service.assignPermissionToAuthorityHolder(res.locals.authorityHolder, body);
	return ok(res, true);
};

export const revokePermissionFromAuthorityHolder: ScopedApiRequestHandler<
	VenueAuthorityHolderScope,
	true
> = async (req, res) => {
	const body = schemas.permissionCodeInputSchema.parse(req.body);
	await service.revokePermissionFromAuthorityHolder(res.locals.authorityHolder, body);
	return ok(res, true);
};
