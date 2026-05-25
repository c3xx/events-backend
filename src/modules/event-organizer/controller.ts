import type { EVENT_ORGANIZER_ROLES } from "@/lib/constants.js";
import { getAuthenticatedUser, ok } from "@/lib/helpers.js";
import { addEventOrganizerSchema, eventScopedSchema, organizerScopedSchema } from "./schema.js";
import * as service from "./service.js";

export const getEventOrganizers: ApiRequestHandler<
	{
		id: number;
		role: (typeof EVENT_ORGANIZER_ROLES)[number];
		organization: {
			id: number;
			name: string;
		};
	}[]
> = async (req, res) => {
	const params = eventScopedSchema.parse(req.params);
	const result = await service.getEventOrganizers(params.eventId);
	return ok(res, result);
};

export const addEventOrganizer: ApiRequestHandler<{
	id: number;
}> = async (req, res) => {
	const user = getAuthenticatedUser(req);
	const params = eventScopedSchema.parse(req.params);
	const body = addEventOrganizerSchema.parse(req.body);
	const result = await service.addEventOrganizer(params.eventId, body, user);
	return ok(res, result, 201);
};

export const removeEventOrganizer: ApiRequestHandler<{
	id: number;
}> = async (req, res) => {
	const user = getAuthenticatedUser(req);
	const params = organizerScopedSchema.parse(req.params);
	const result = await service.removeEventOrganizer(params.eventId, params.organizerId, user);
	return ok(res, result);
};
