import * as repository from "./repository.js";
import { getUserOrganizations } from "../user/repository.js";
import type {
	CreateEventSchema,
	CreateVenueAllotmentSchema,
	GetEventsQuerySchema,
	UpdateEventSchema,
} from "./schema.js";
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors.js";
import { hasPermission } from "../permission/service.js";

export async function createEvent(
	user: { id: number; type: UserType; permissions: PermissionCode[] },
	input: CreateEventSchema,
) {
	if (await hasPermission(user, "organization", [input.organizationId], "event:manage")) {
		return await repository.createEvent({
			organizationId: input.organizationId,
			eventTitle: input.eventTitle,
			eventTypeId: input.eventTypeId,
			expectedParticipants: input.expectedParticipants,
			requestDetails: input.requestDetails,
			startsAt: input.startsAt,
			endsAt: input.endsAt,
			parentEventId: input.parentEventId,
		});
	} else {
		throw new ForbiddenError("You do not have any required permission for this");
	}
}

export async function updateEvent(
	user: { id: number; type: UserType; permissions: PermissionCode[] },
	eventId: number,
	input: UpdateEventSchema,
) {
	const orgIds = await repository.findEventOrganizerOrgIds(eventId);
	if (orgIds.length === 0) throw new NotFoundError("Event not found");

	const hasAccess = await hasPermission(user, "organization", orgIds, "event:manage");

	if (!hasAccess) {
		throw new ForbiddenError("You do not have any required permission for this");
	}

	return await repository.updateEvent({
		eventId,
		eventTitle: input.eventTitle,
		eventTypeId: input.eventTypeId,
		expectedParticipants: input.expectedParticipants,
		requestDetails: input.requestDetails,
		startsAt: input.startsAt,
		endsAt: input.endsAt,
		parentEventId: input.parentEventId,
	});
}

export async function getEvent(
	user: { id: number; type: UserType; permissions: PermissionCode[] },
	eventId: number,
) {
	const event = await repository.findEventById(eventId);
	if (event == null) throw new NotFoundError("Event not found");

	if (user.type === "admin") return event;

	const hasViewAll = user.permissions.includes("event:view_all");
	if (hasViewAll) return event;

	const hasViewAllConfirmed = user.permissions.includes("event:view_all_confirmed");
	if (hasViewAllConfirmed && event.status === "completed") return event;

	const eventOrgIds = event.organizers.map((o) => o.organization.id);

	if (eventOrgIds.length > 0) {
		const hasAccess = await hasPermission(user, "organization", eventOrgIds, "event:view_own");

		if (hasAccess) return event;
	}

	throw new ForbiddenError("You do not have permission to view this event");
}

export async function getEvents(
	user: { id: number; type: UserType; permissions: PermissionCode[] },
	filter: GetEventsQuerySchema,
) {
	if (user.type === "admin") {
		return await repository.findEvents({
			status: filter.status,
			eventTypeId: filter.eventTypeId,
			viewAll: true,
		});
	}

	const hasViewAll = user.permissions.includes("event:view_all");
	const hasViewAllConfirmed = user.permissions.includes("event:view_all_confirmed");
	const hasViewOwn = user.permissions.includes("event:view_own");

	if (!hasViewAll && !hasViewAllConfirmed && !hasViewOwn) return [];

	const orgIds = hasViewOwn && !hasViewAll ? await getUserOrganizations(user.id) : [];

	return await repository.findEvents({
		status: filter.status,
		eventTypeId: filter.eventTypeId,
		viewAll: hasViewAll,
		viewAllConfirmed: !hasViewAll && hasViewAllConfirmed,
		orgIds,
	});
}

export async function createVenueAllotment(
	user: { id: number; type: UserType },
	eventId: number,
	input: CreateVenueAllotmentSchema,
) {
	const orgIds = await repository.findEventOrganizerOrgIds(eventId);
	if (orgIds.length === 0) {
		throw new NotFoundError("Event not found");
	}

	const hasAccess = await hasPermission(user, "organization", orgIds, "event:allot_venue");

	if (!hasAccess) {
		throw new ForbiddenError("You do not have permission to allot venues for this event");
	}

	const conflictingAllotments = await repository.findOverlappingVenueAllotments(input);

	if (conflictingAllotments.length > 0) {
		throw Object.assign(
			new ConflictError("Venue(s) are not available for the requested time slots"),
			{ details: conflictingAllotments },
		);
	}

	return await repository.insertVenueAllotments(eventId, input);
}
