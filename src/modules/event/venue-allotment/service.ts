import { BadRequestError, ConflictError, ForbiddenError } from "@/lib/errors.js";
import { unreachable } from "@/lib/helpers.js";
import type { EventScope } from "@/modules/event/scopes.js";
import * as permissionRepository from "@/modules/permission/repository.js";
import * as repository from "./repository.js";
import type * as schemas from "./schema.js";

export async function createVenueAllotment(
	user: AuthenticatedUser,
	event: EventScope["event"],
	input: schemas.CreateVenueAllotmentSchema,
) {
	if (event.status !== "draft") throw new BadRequestError("Only draft events can be modified");

	const hostOrganizers = event.organizers.filter((organizer) => organizer.role === "host");
	if (hostOrganizers.length !== 1 || hostOrganizers[0] == null) unreachable();
	const hostOrganizer = hostOrganizers[0]; // note: only host can do stuff.

	const hasAccess = await permissionRepository.hasPermissionInManagedEntity(
		user,
		"organization",
		[hostOrganizer.organization.id],
		"event:manage",
	);

	if (!hasAccess) {
		throw new ForbiddenError("You do not have permission to manage venues of this event");
	}

	const result = await repository.insertVenueAllotment(event.id, input);

	if (!result.success) {
		throw new ConflictError("Venue is not available for the requested time slot", result.conflict);
	}

	return { id: result.id };
}

export async function deleteVenueAllotment(
	user: { id: number; type: UserType },
	eventId: number,
	allotmentId: number,
) {
	const event = await eventRepository.findEventById(eventId);
	if (event == null) {
		throw new NotFoundError("Event not found");
	}

	const orgIds = event.organizers.map((o) => o.organization.id);
	if (orgIds.length === 0) {
		throw new NotFoundError("Event organizers not found");
	}

	const hasAccess = await permissionRepository.hasPermissionInManagedEntity(
		user,
		"organization",
		orgIds,
		"event:allot_venue",
	);

	if (!hasAccess) {
		throw new ForbiddenError(
			"You do not have permission to manage venue allotments for this event",
		);
	}

	if (event.status !== "draft") {
		throw new ConflictError("Venue allotments can only be removed from draft events");
	}

	const result = await repository.deleteVenueAllotment(eventId, allotmentId);
	if (result == null) {
		throw new NotFoundError("Venue allotment not found");
	}

	return { id: result.id };
}
