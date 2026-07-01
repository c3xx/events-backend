import { BadRequestError, ConflictError, ForbiddenError } from "@/lib/errors.js";
import { unreachable } from "@/lib/helpers.js";
import type { EventScope } from "@/modules/event/scopes.js";
import * as permissionRepository from "@/modules/permission/repository.js";
import * as repository from "./repository.js";
import type * as schemas from "./schema.js";
import {venueType} from "@/db/schema.js";

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

	if( input.startsAt < event.startsAt || event.startsAt > event.endsAt) {
		throw new BadRequestError("You cannot allot venues beyond an event's period")
	}
	return { id: result.id };
}
