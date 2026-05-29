import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors.js";
import * as eventRepository from "@/modules/event/repository.js";
import { hasPermissionInManagedEntity } from "@/modules/permission/repository.js";
import * as repository from "./repository.js";
import type * as schema from "./schema.js";

export async function createVenueAllotment(
	user: { id: number; type: UserType },
	eventId: number,
	input: schema.CreateVenueAllotmentSchema,
) {
	const orgIds = await eventRepository.findEventOrganizerOrgIds(eventId);
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

	const result = await repository.insertVenueAllotment(eventId, input);

	if (!result.success) {
		throw new ConflictError("Venue is not available for the requested time slot", result.conflict);
	}

	return { id: result.id };
}
