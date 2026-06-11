import { getAuthenticatedUser, ok } from "@/lib/helpers.js";
import { eventScopedSchema } from "@/modules/event/schema.js";
import { addEventOrganizerSchema, organizerScopedSchema } from "./schema.js";
import * as service from "./service.js";

export const getEventOrganizers: ApiRequestHandler<
	{
		id: number;
		role: EventOrganizerRole;
		organization: {
			id: number;
			name: string;
		};
	}[]
> = async (req, res) => {
	const params = eventScopedSchema.parse(req.params);
	const result = await service.getEventOrganizers(params.id);
	return ok(res, result);
};

export const addEventOrganizer: ApiRequestHandler<
	{ id: number } | { id: number; role: EventOrganizerRole; organizationId: number }
> = async (req, res) => {
	const user = getAuthenticatedUser(req);
	const params = eventScopedSchema.parse(req.params);
	const body = addEventOrganizerSchema.parse(req.body);
	const result = await service.addEventOrganizer(params.id, body, user);
	return ok(res, result, 201);
};

export const removeEventOrganizer: ApiRequestHandler<true> = async (req, res) => {
	const user = getAuthenticatedUser(req);
	const params = organizerScopedSchema.parse(req.params);
	await service.removeEventOrganizer(params.eventId, params.organizerId, user);
	return ok(res, true);
};
