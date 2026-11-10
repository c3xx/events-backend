import { ForbiddenError, NotFoundError } from "@/lib/errors.js";
import { getAuthenticatedUser, idLike, scopedParamHandler } from "@/lib/helpers.js";
import * as eventRepository from "@/modules/event/repository.js";
import * as permissionRepository from "@/modules/permission/repository.js";
import * as organizationAuthorityRepository from "../organization/authority/repository.js";
import { hasPermissionInManagedEntity } from "../permission/repository.js";

export type EventScope = {
	event: {
		id: number;
		title: string;
		expectedParticipants: number;
		requestDetails: string;
		status: EventStatus;
		createdAt: string;
		startsAt: string;
		endsAt: string;
		type: {
			id: number;
			name: string;
			collaborationPolicy: EventTypeCollaborationPolicy;
			venuePolicy: EventTypeVenuePolicy;
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
			facilities: {
				id: number;
				venueAllotmentId: number | null;
				facility: {
					id: number;
					name: string;
					type: {
						id: number;
						name: string;
					};
					isAvailable: boolean;
				};
			}[];
		}[];
		facilities: {
			id: number;
			venueAllotmentId: number | null;
			facility: {
				id: number;
				name: string;
				type: {
					id: number;
					name: string;
				};
				isAvailable: boolean;
			};
		}[];
	};
};

export const eventIdParamHandler = scopedParamHandler<EventScope, number>(
	idLike("Invalid event ID"),
	async (_req, res, _next, eventId) => {
		const user = getAuthenticatedUser(_req);
		const event = await eventRepository.findEventById(eventId);
		if (event == null) throw new NotFoundError("Could not find the event");

		const hasDirectPermission = await hasPermissionInManagedEntity(
			user,
			"organization",
			event.organizers.map((org) => org.organization.id),
			"event:view_own",
		);
		if (!hasDirectPermission) {
			const err = new ForbiddenError("You don't have permission to view this event");

			const host = event.organizers.find((organizer) => organizer.role === "host");
			if (host == null) throw err;

			// no direct permission, but what are the authority holders of this host organization, with permission to view these events?
			const authorityHoldingOrganizations = await organizationAuthorityRepository.findAll(
				host.organization.id,
				["event:view"],
			);
			if (authorityHoldingOrganizations.length === 0) throw err;

			// and is, auth user, a member of any of these authority holding organizations with the permission to view this event?
			const canExerciseAuthority = await permissionRepository.hasPermissionInManagedEntity(
				user,
				"organization",
				authorityHoldingOrganizations.map(({ organization }) => organization.id),
				"authority_organization:view_organization_events",
			);
			if (!canExerciseAuthority) throw err;
		}

		res.locals.event = event;
	},
);
