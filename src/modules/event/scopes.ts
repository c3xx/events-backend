import { NotFoundError } from "@/lib/errors.js";
import { idLike, scopedParamHandler, unreachable } from "@/lib/helpers.js";
import * as eventRepository from "@/modules/event/repository.js";

export type eventScope = {
	event: {
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
		type: {
			id: number;
			name: string;
		};
		category: {
			id: number;
			name: string;
		};
		parentEvent: {
			id: number;
			title: string;
		} | null;
		organizers: {
			id: number;
			organization: {
				id: number;
				name: string;
			};
			role: EventOrganizerRole;
		}[];
		venueAllotments: {
			id: number;
			startsAt: string;
			endsAt: string;
			venue: {
				id: number;
				name: string;
			};
		}[];
		report: {
			id: number;
			details: string;
			submittedAt: string;
		} | null;
	};
};

export const eventIdParamHandler = scopedParamHandler<eventScope, number>(
	idLike("Invalid event ID"),
	async (_req, res, _next, eventId) => {
		if (res.locals.event == null) unreachable();
		const event = await eventRepository.findEventById(eventId);
		if (event == null) throw new NotFoundError("Could not find the event");
		res.locals.event = event;
	},
);
