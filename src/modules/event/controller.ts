import { getAuthenticatedUser, ok } from "@/lib/helpers.js";
import * as service from "./service.js";
import {
	createEventSchema,
	createVenueAllotmentBodySchema,
	eventScopedSchema,
	getEventsQuerySchema,
	updateEventSchema,
} from "./schema.js";

export const createEvent: ApiRequestHandler<{
	id: number;
}> = async (req, res) => {
	const user = getAuthenticatedUser(req);
	const body = createEventSchema.parse(req.body);
	const result = await service.createEvent(user, body);
	return ok(res, result);
};

export const getEvents: ApiRequestHandler<
	{
		id: number;
		eventTitle: string;
		eventType: { id: number; name: string };
		status: EventStatus;
		parentEvent: { id: number; eventTitle: string } | null;
		startsAt: string;
		organizers: {
			organizerId: number;
			organizerName: string;
			organizerType: EventOrganizerRole;
		}[];
	}[]
> = async (req, res) => {
	const query = getEventsQuerySchema.parse(req.query);
	const user = getAuthenticatedUser(req);
	const result = await service.getEvents(user, query);
	return ok(res, result);
};

export const getEvent: ApiRequestHandler<{
	id: number;
	eventTitle: string;
	expectedParticipants: number;
	requestDetails: string;
	status: EventStatus;
	parentEventId: number | null;
	startsAt: string;
	endsAt: string;
	createdAt: string;
	updatedAt: string;
	eventType: { id: number; name: string };
	parentEvent: { id: number; eventTitle: string } | null;
	organizers: {
		role: EventOrganizerRole;
		organization: { id: number; name: string };
	}[];
	venueAllotments: {
		id: number;
		startsAt: string;
		endsAt: string;
		venue: { id: number; name: string };
	}[];
	report: { id: number; details: string; submittedAt: string } | null;
}> = async (req, res) => {
	const { id } = eventScopedSchema.parse(req.params);
	const user = getAuthenticatedUser(req);
	const result = await service.getEvent(user, id);
	return ok(res, result);
};

export const updateEvent: ApiRequestHandler<{
	id: number;
}> = async (req, res) => {
	const { id } = eventScopedSchema.parse(req.params);
	const user = getAuthenticatedUser(req);
	const body = updateEventSchema.parse(req.body);
	const result = await service.updateEvent(user, id, body);
	return ok(res, result);
};

export const createVenueAllotment: ApiRequestHandler<{ id: number }[]> = async (req, res) => {
	const user = getAuthenticatedUser(req);
	const params = eventScopedSchema.parse(req.params);
	const body = createVenueAllotmentBodySchema.parse(req.body);
	const result = await service.createVenueAllotment(user, params.id, body);
	return ok(res, result);
};
