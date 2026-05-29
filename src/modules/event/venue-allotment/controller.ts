import { getAuthenticatedUser, ok } from "@/lib/helpers.js";
import { eventScopedSchema } from "../schema.js";
import * as schema from "./schema.js";
import * as service from "./service.js";

export const createVenueAllotment: ApiRequestHandler<{ id: number }> = async (req, res) => {
	const user = getAuthenticatedUser(req);
	const params = eventScopedSchema.parse(req.params);
	const body = schema.createVenueAllotmentSchema.parse(req.body);
	const result = await service.createVenueAllotment(user, params.id, body);
	return ok(res, result);
};
