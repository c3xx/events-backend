import { getAuthenticatedUser, ok } from "@/lib/helpers.js";
import type { EventScope } from "@/modules/event/scopes.js";
import * as schemas from "./schema.js";
import * as service from "./service.js";

export const createVenueAllotment: ScopedApiRequestHandler<
	EventScope,
	{
		id: number;
	}
> = async (req, res) => {
	const user = getAuthenticatedUser(req);
	const body = schemas.createVenueAllotmentSchema.parse(req.body);
	const result = await service.createVenueAllotment(user, res.locals.event, body);
	return ok(res, result);
};

export const deleteVenueAllotment: ScopedApiRequestHandler<EventScope, true> = async (req, res) => {
	const user = getAuthenticatedUser(req);
	const params = schemas.allotmentScopedSchema.parse(req.params);
	await service.deleteVenueAllotment(user, res.locals.event, params.allotmentId);
	return ok(res, true);
};
