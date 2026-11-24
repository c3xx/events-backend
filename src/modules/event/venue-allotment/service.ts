import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors.js";
import { unreachable } from "@/lib/helpers.js";
import type { EventScope } from "@/modules/event/scopes.js";
import * as permissionRepository from "@/modules/permission/repository.js";
import * as authorityRepository from "@/repositories/managed-entity-authority.js";
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

	const hasEventManageAccess = await permissionRepository.hasPermissionInManagedEntity(
		user,
		"organization",
		[hostOrganizer.organization.id],
		"event:manage",
	);

	if (!hasEventManageAccess)
		throw new ForbiddenError("You do not have permission to manage venues of this event");

	// does any of the hosts or co-hosts have access over the venue to request the venue?
	const hasAuthorityOverVenue = await authorityRepository.hasAuthorityHolder(
		{
			subjectType: "venue",
			subjectRefId: input.venueId,
		},
		{
			holderTypes: ["organization"],
			withPermissions: ["venue:request"],
			holderRefIds: event.organizers
				.filter((organizer) => organizer.role === "host" || organizer.role === "co_host")
				.map((organizer) => organizer.organization.id),
		},
	);
	if (!hasAuthorityOverVenue)
		throw new ForbiddenError("None of the organizers are allowed to request this venue for events");

	if (
		input.startsAt < event.startsAt ||
		input.endsAt > event.endsAt ||
		input.startsAt >= input.endsAt
	) {
		throw new BadRequestError("Allotment must fall within the event's period");
	}

	const result = await repository.insertVenueAllotment(event.id, input);

	if (!result.success)
		throw new ConflictError("Venue is not available for the requested time slot", result.conflict);

	return { id: result.id };
}

export async function deleteVenueAllotment(
	user: AuthenticatedUser,
	event: EventScope["event"],
	allotmentId: number,
) {
	const hostOrganizers = event.organizers.filter((organizer) => organizer.role === "host");
	if (hostOrganizers.length !== 1 || hostOrganizers[0] == null) unreachable();
	const hostOrganizer = hostOrganizers[0];

	const hasAccess = await permissionRepository.hasPermissionInManagedEntity(
		user,
		"organization",
		[hostOrganizer.organization.id],
		"event:manage",
	);

	if (!hasAccess) {
		throw new ForbiddenError(
			"You do not have permission to manage venue allotments for this event",
		);
	}

	if (event.status !== "draft") {
		throw new ConflictError("Venue allotments can only be removed from draft events");
	}

	const result = await repository.deleteVenueAllotment(event.id, allotmentId);

	if (result == null) throw new NotFoundError("Venue allotment not found");
}
