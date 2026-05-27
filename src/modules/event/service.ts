import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors.js";
import { getEventType } from "../event-type/repository.js";
import { getOrganization } from "../organization/repository.js";
import { hasPermissionInManagedEntity } from "../permission/repository.js";
import { getUserOrganizationIds } from "../user/repository.js";
import * as repository from "./repository.js";
import type {
	CreateEventSchema,
	CreateVenueAllotmentSchema,
	GetEventsQuerySchema,
	UpdateEventSchema,
} from "./schema.js";

export async function createEvent(
	user: { id: number; type: UserType; permissions: PermissionCode[] },
	input: CreateEventSchema,
) {
	if (
		!(await hasPermissionInManagedEntity(
			user,
			"organization",
			[input.organizationId],
			"event:manage",
		))
	) {
		throw new ForbiddenError("You do not have any required permission for this");
	}

	if ((await getOrganization(input.organizationId)) == null) {
		throw new NotFoundError("Organization not found");
	}
	const eventType = await getEventType(input.typeId);
	if (eventType == null) {
		throw new NotFoundError("Event type not found");
	} else if (eventType.isActive === false) {
		throw new ConflictError("Event type is inactive");
	}
	if (
		input.parentEventId != null &&
		(await repository.findEventById(input.parentEventId)) == null
	) {
		throw new NotFoundError("Parent event not found");
	}

	return await repository.createEvent({
		organizationId: input.organizationId,
		title: input.title,
		typeId: input.typeId,
		categoryId: input.categoryId,
		expectedParticipants: input.expectedParticipants,
		requestDetails: input.requestDetails,
		startsAt: input.startsAt,
		endsAt: input.endsAt,
		parentEventId: input.parentEventId,
	});
}

export async function updateEvent(
	user: { id: number; type: UserType; permissions: PermissionCode[] },
	eventId: number,
	input: UpdateEventSchema,
) {
	const orgIds = await repository.findEventOrganizerOrgIds(eventId);
	if (orgIds.length === 0) throw new NotFoundError("Event not found");

	const hasAccess = await hasPermissionInManagedEntity(
		user,
		"organization",
		orgIds,
		"event:manage",
	);

	if (!hasAccess) {
		throw new ForbiddenError("You do not have any required permission for this");
	}

	const result = await repository.updateEvent({
		id: eventId,
		title: input.title,
		typeId: input.typeId,
		categoryId: input.categoryId,
		expectedParticipants: input.expectedParticipants,
		requestDetails: input.requestDetails,
		startsAt: input.startsAt,
		endsAt: input.endsAt,
		parentEventId: input.parentEventId,
	});
	if (result == null) {
		throw new NotFoundError("Event not found");
	} else if ("eventExist" in result) {
		throw new ConflictError("Only draft events can be updated");
	}
	return result;
}

export async function getEvent(
	user: { id: number; type: UserType; permissions: PermissionCode[] },
	eventId: number,
) {
	const event = await repository.findEventById(eventId);
	if (event == null) throw new NotFoundError("Event not found");

	if (user.type === "admin") return event;

	const perms = new Set(user.permissions);
	if (perms.has("event:view_all")) return event;
	if (perms.has("event:view_all_non_draft") && event.status !== "draft") return event;
	if (perms.has("event:view_all_confirmed") && event.status === "approved") return event;

	const eventOrgIds = event.organizers.map((o) => o.organization.id);

	if (eventOrgIds.length > 0) {
		const hasAccess = await hasPermissionInManagedEntity(
			user,
			"organization",
			eventOrgIds,
			"event:view_own",
		);

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
			typeId: filter.typeId,
			viewAll: true,
		});
	}

	const perms = new Set(user.permissions);
	const grants = {
		viewAll: perms.has("event:view_all"),
		viewAllNonDraft: perms.has("event:view_all_non_draft"),
		viewAllConfirmed: perms.has("event:view_all_confirmed"),
		viewOwn: perms.has("event:view_own"),
	};

	if (!Object.values(grants).some(Boolean)) return [];

	const orgIds =
		grants.viewOwn && !grants.viewAll
			? await getUserOrganizationIds(user.id, "event:view_own")
			: [];

	return await repository.findEvents({
		status: filter.status,
		typeId: filter.typeId,
		viewAll: grants.viewAll,
		viewAllNonDraft: !grants.viewAll && grants.viewAllNonDraft,
		viewAllConfirmed: !grants.viewAll && !grants.viewAllNonDraft && grants.viewAllConfirmed,
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

	const hasAccess = await hasPermissionInManagedEntity(
		user,
		"organization",
		orgIds,
		"event:allot_venue",
	);

	if (!hasAccess) {
		throw new ForbiddenError("You do not have permission to allot venues for this event");
	}

	const result = await repository.insertVenueAllotments(eventId, input);

	if (!result.success) {
		throw new ConflictError("Venue is not available for the requested time slot", result.conflict);
	}

	return { id: result.id };
}
