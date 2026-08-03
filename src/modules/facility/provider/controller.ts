import { ok } from "@/lib/helpers.js";
import type { FacilityScope } from "../scopes.js";
import * as schemas from "./schema.js";
import * as service from "./service.js";

export const addFacilityProvider: ScopedApiRequestHandler<
	FacilityScope,
	{
		id: number;
	}
> = async (req, res) => {
	const body = schemas.addFacilityProviderSchema.parse(req.body);
	const result = await service.addFacilityProvider(res.locals.facility, body);
	return ok(res, result);
};

export const removeFacilityProvider: ScopedApiRequestHandler<FacilityScope, true> = async (
	req,
	res,
) => {
	const params = schemas.removeFacilityProviderSchema.parse(req.params);
	await service.removeFacilityProvider(res.locals.facility, params.providerId);
	return ok(res, true);
};
