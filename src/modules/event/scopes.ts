import { ForbiddenError, NotFoundError } from "@/lib/errors.js";
import { getAuthenticatedUser, idLike, scopedParamHandler } from "@/lib/helpers.js";
import * as eventRepository from "@/modules/event/repository.js";
import { hasPermissionInManagedEntity } from "../permission/repository.js";

export type EventScope = {
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

export const eventIdParamHandler = scopedParamHandler<EventScope, number>(
	idLike("Invalid event ID"),
	async (_req, res, _next, eventId) => {
		const user = getAuthenticatedUser(_req);
		const event = await eventRepository.findEventById(eventId);
		if (event == null) throw new NotFoundError("Could not find the event");
		const organizationIds = event.organizers.map((org) => org.organization.id);
		const hasPermission = await hasPermissionInManagedEntity(
			user,
			"organization",
			organizationIds,
			"event:view_own",
		);
		if (!hasPermission) {
			throw new ForbiddenError("You don't have permission to view this");
		}
		res.locals.event = event;
	},
);
