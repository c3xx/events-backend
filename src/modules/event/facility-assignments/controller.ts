import { getAuthenticatedUser, ok } from "@/lib/helpers.js";
import type { EventScope } from "@/modules/event/scopes.js";
import * as schemas from "./schema.js";
import * as service from "./service.js";

export const assignEventFacility: ScopedApiRequestHandler<
	EventScope,
	{
		id: number;
	}
> = async (req, res) => {
	const user = getAuthenticatedUser(req);
	const body = schemas.assignEventFacilitySchema.parse(req.body);
	const result = await service.assignEventFacility(user, res.locals.event, body);
	return ok(res, result);
};

export const unassignEventFacility: ScopedApiRequestHandler<EventScope, true> = async (
	req,
	res,
) => {
	const user = getAuthenticatedUser(req);
	const params = schemas.eventFacilityScopedSchema.parse(req.params);
	await service.unassignEventFacility(user, res.locals.event, params.eventFacilityId);
	return ok(res, true);
};
