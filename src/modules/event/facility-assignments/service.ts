import { BadRequestError, ConflictError, ForbiddenError } from "@/lib/errors.js";
import { unreachable } from "@/lib/helpers.js";
import type { EventScope } from "@/modules/event/scopes.js";
import * as facilityRepository from "@/modules/facility/repository.js";
import * as permissionRepository from "@/modules/permission/repository.js";
import * as repository from "./repository.js";
import type * as schemas from "./schema.js";

export async function assignEventFacility(
	user: AuthenticatedUser,
	event: EventScope["event"],
	input: schemas.AssignEventFacilitySchema,
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

	if (!hasAccess)
		throw new ForbiddenError("You do not have permission to manage facilities of this event");

	const facility = await facilityRepository.findFacilityById(input.facilityId);
	if (facility == null) throw new BadRequestError("Specified facility not found");

	if (!facility.isAvailable)
		throw new BadRequestError("The facility is not available for assignment");

	if (input.venueAllotmentId == null) {
		if (facility.association !== "event")
			throw new BadRequestError("This facility can only be associated with a venue");

		const existing = event.facilities.find(
			(facilityAssignment) => facilityAssignment.facility.id === input.facilityId,
		);

		if (existing != null)
			throw new ConflictError("The facility is already assigned to the event", existing);
	} else {
		if (facility.association !== "venue_allotment")
			throw new BadRequestError("This facility can only be associated with an event");

		const existing = event.venueAllotments
			.flatMap((allotment) => allotment.facilities.map((facility) => ({ facility, allotment })))
			.find(
				({ facility, allotment }) =>
					facility.facility.id === input.facilityId && allotment.id === input.venueAllotmentId,
			);

		if (existing != null)
			throw new ConflictError("The facility is already assigned to the event", existing);

		const venueAllotment = event.venueAllotments.find(
			(allotment) => allotment.id === input.venueAllotmentId,
		);
		if (venueAllotment == null)
			throw new BadRequestError("Could not find the venue allotment in this event");

		const venueAsProvider = facility.providers.find(
			(provider) =>
				provider.scope.type === "venue" && provider.scope.id === venueAllotment.venue.id,
		);
		if (venueAsProvider == null)
			throw new BadRequestError(
				"Facility cannot be assigned to this venue allotment, as the venue isn't the provider of this facility",
			);
	}

	const result = await repository.insertFacilityAssignment(event.id, {
		facilityId: input.facilityId,
		venueAllotmentId: input.venueAllotmentId,
	});

	if (result == null) throw new Error("Could not find facility details");

	if (!result.success)
		throw new ConflictError(
			"The requested facility cannot be assigned to this event",
			result.conflict,
		);

	return result.assignment;
}

export async function unassignEventFacility(
	user: AuthenticatedUser,
	event: EventScope["event"],
	facilityAssignmentId: number,
) {
	if (event.status !== "draft") throw new BadRequestError("Only draft events can be modified");

	const hostOrganizers = event.organizers.filter((organizer) => organizer.role === "host");
	if (hostOrganizers.length !== 1 || hostOrganizers[0] == null) unreachable();
	const hostOrganizer = hostOrganizers[0];

	const hasAccess = await permissionRepository.hasPermissionInManagedEntity(
		user,
		"organization",
		[hostOrganizer.organization.id],
		"event:manage",
	);

	if (!hasAccess)
		throw new ForbiddenError("You do not have permission to manage facilities of this event");

	const deleted = await repository.deleteFacilityAssignment(event.id, facilityAssignmentId);
	if (deleted == null) throw new BadRequestError("Could not find the facility assignment");
}
