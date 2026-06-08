import { getAuthenticatedUser, ok } from "@/lib/helpers.js";
import * as schemas from "./schema.js";
import * as service from "./service.js";
import type { eventScope } from "./scopes.js";

export const createEvent: ApiRequestHandler<{
	id: number;
}> = async (req, res) => {
	const user = getAuthenticatedUser(req);
	const body = schemas.createEventSchema.parse(req.body);
	const result = await service.createEvent(user, body);
	return ok(res, result);
};

export const getEvents: ApiRequestHandler<
	{
		id: number;
		title: string;
		type: { id: number; name: string };
		category: { id: number; name: string };
		status: EventStatus;
		parentEvent: { id: number; title: string } | null;
		startsAt: string;
		organizers: {
			id: number;
			organization: {
				id: number;
				name: string;
			};
			role: EventOrganizerRole;
		}[];
	}[]
> = async (req, res) => {
	const query = schemas.getEventsQuerySchema.parse(req.query);
	const user = getAuthenticatedUser(req);
	const result = await service.getEvents(user, query);
	return ok(res, result);
};

export const getEvent: ApiRequestHandler<{
	id: number;
	title: string;
	expectedParticipants: number;
	requestDetails: string;
	status: EventStatus;
	parentEventId: number | null;
	startsAt: string;
	endsAt: string;
	createdAt: string;
	updatedAt: string;
	type: { id: number; name: string };
	category: { id: number; name: string };
	parentEvent: { id: number; title: string } | null;
	organizers: {
		id: number;
		organization: { id: number; name: string };
		role: EventOrganizerRole;
	}[];
	venueAllotments: {
		id: number;
		startsAt: string;
		endsAt: string;
		venue: { id: number; name: string };
	}[];
	report: { id: number; details: string; submittedAt: string } | null;
}> = async (req, res) => {
	const { id } = schemas.eventScopedSchema.parse(req.params);
	const user = getAuthenticatedUser(req);
	const result = await service.getEvent(user, id);
	return ok(res, result);
};

export const updateEvent: ApiRequestHandler<{
	id: number;
}> = async (req, res) => {
	const { id } = schemas.eventScopedSchema.parse(req.params);
	const user = getAuthenticatedUser(req);
	const body = schemas.updateEventSchema.parse(req.body);
	const result = await service.updateEvent(user, id, body);
	return ok(res, result);
};

export const createWorkflowInstance: ScopedApiRequestHandler<
	eventScope,
	{
		id: number;
	}
> = async (_req, res) => {
	const user = getAuthenticatedUser(_req);
	const result = await service.createWorkflowInstance(user, res.locals.event);
	return ok(res, result);
};
