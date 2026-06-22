import { getAuthenticatedUser, ok } from "@/lib/helpers.js";
import type { EventScope } from "@/modules/event/scopes.js";
import { addEventOrganizerSchema, organizerScopedSchema } from "./schema.js";
import * as service from "./service.js";

export const getEventOrganizers: ScopedApiRequestHandler<
	EventScope,
	{
		id: number;
		role: EventOrganizerRole;
		organization: {
			id: number;
			name: string;
		};
	}[]
> = async (_req, res) => {
	const result = await service.getEventOrganizers(res.locals.event);
	return ok(res, result);
};

export const addEventOrganizer: ScopedApiRequestHandler<
	EventScope,
	{ id: number } | { id: number; role: EventOrganizerRole; organizationId: number }
> = async (req, res) => {
	const user = getAuthenticatedUser(req);
	const body = addEventOrganizerSchema.parse(req.body);
	const result = await service.addEventOrganizer(res.locals.event, body, user);
	return ok(res, result, 201);
};

export const removeEventOrganizer: ScopedApiRequestHandler<EventScope, true> = async (req, res) => {
	const user = getAuthenticatedUser(req);
	const params = organizerScopedSchema.parse(req.params);
	await service.removeEventOrganizer(res.locals.event, params.organizerId, user);
	return ok(res, true);
};
