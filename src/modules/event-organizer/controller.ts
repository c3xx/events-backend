import { ok } from "@/lib/helpers.js";
import {
	addEventOrganizerSchema,
	eventScopedSchema,
	organizerScopedSchema,
} from "./schema.js";
import * as service from "./service.js";

export const getEventOrganizers: ApiRequestHandler<
	{
		id: number;
		role: "host" | "co_host"; //or should resource_provider also be given?
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
	const params = eventScopedSchema.parse(req.params);
	const body = addEventOrganizerSchema.parse(req.body);
	const result = await service.addEventOrganizer(params.eventId, body);
	return ok(res, result, 201);
};

export const removeEventOrganizer: ApiRequestHandler<{
	id: number;
}> = async (req, res) => {
	const params = organizerScopedSchema.parse(req.params);
	const result = await service.removeEventOrganizer(params.eventId, params.organizerId);
	return ok(res, result);
};
