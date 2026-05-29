import { ok } from "@/lib/helpers.js";
import { createEventTypeSchema, eventTypeScopedSchema } from "./schema.js";
import * as service from "./service.js";

export const getEventTypes: ApiRequestHandler<
	{
		id: number;
		name: string;
		isActive: boolean;
		venuePolicy: EventTypeVenuePolicy;
		collaborationPolicy: EventTypeCollaborationPolicy;
	}[]
> = async (_req, res) => {
	const result = await service.getEventTypes();
	return ok(res, result);
};

export const getEventType: ApiRequestHandler<{
	id: number;
	name: string;
	workflowTemplateId: number;
	isActive: boolean;
	venuePolicy: EventTypeVenuePolicy;
	collaborationPolicy: EventTypeCollaborationPolicy;
}> = async (req, res) => {
	const params = eventTypeScopedSchema.parse(req.params);
	const result = await service.getEventType(params.id);
	return ok(res, result);
};

export const createEventType: ApiRequestHandler<{
	id: number;
}> = async (req, res) => {
	const body = createEventTypeSchema.parse(req.body);
	const result = await service.createEventType(body);
	return ok(res, result);
};

export const deleteEventType: ApiRequestHandler<true> = async (req, res) => {
	const params = eventTypeScopedSchema.parse(req.params);
	await service.deleteEventType(params.id);
	return ok(res, true);
};
