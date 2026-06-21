import { getAuthenticatedUser, ok } from "@/lib/helpers.js";
import { eventScopedSchema } from "@/modules/event/schema.js";
import * as schemas from "./schema.js";
import * as service from "./service.js";

export const createVenueAllotment: ApiRequestHandler<{ id: number }> = async (req, res) => {
	const user = getAuthenticatedUser(req);
	const params = eventScopedSchema.parse(req.params);
	const body = schemas.createVenueAllotmentSchema.parse(req.body);
	const result = await service.createVenueAllotment(user, params.eventId, body);
	return ok(res, result);
};

export const deleteVenueAllotment: ApiRequestHandler<{ id: number }> = async (req, res) => {
	const user = getAuthenticatedUser(req);
	const params = schemas.allotmentScopedSchema.parse(req.params);
	const result = await service.deleteVenueAllotment(user, params.eventId, params.allotmentId);
	return ok(res, result);
};
