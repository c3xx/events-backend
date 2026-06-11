import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors.js";
import { unreachable } from "@/lib/helpers.js";
import * as invitationRepository from "@/modules/event/organizer-invitation/repository.js";
import * as eventRepository from "@/modules/event/repository.js";
import { hasPermissionInManagedEntity } from "@/modules/permission/repository.js";
import * as repository from "./repository.js";
import type { AddEventOrganizerSchema } from "./schema.js";

export async function getEventOrganizers(eventId: number) {
	const event = await eventRepository.findEventById(eventId);
	if (event == null) throw new NotFoundError("Event not found");
	return await repository.getEventOrganizers(eventId);
}

export async function addEventOrganizer(
	eventId: number,
	input: AddEventOrganizerSchema,
	user: { id: number; type: UserType },
) {
	const event = await eventRepository.findEventById(eventId);
	if (event == null) throw new NotFoundError("Event not found");

	const hostOrganizers = event.organizers.filter((organizer) => organizer.role === "host");
	if (hostOrganizers.length !== 1 || hostOrganizers[0] == null) unreachable();
	const hostOrganizer = hostOrganizers[0]; // note: only host can do stuff.

	// todo: decide whether these actions are host-only. or implemenet permissions

	// check if the user is in host org + has permission to perform + with the given userroleid
	const canManageOrganizers = await hasPermissionInManagedEntity(
		user,
		"organization",
		[hostOrganizer.organization.id], // only hosts can
		"event_organizer:manage",
		input.userRoleId,
	);
	if (!canManageOrganizers)
		throw new ForbiddenError("You do not have permission to manage this event's organizers");

	if (event.status !== "draft")
		throw new ForbiddenError("Organizers can only be added during draft stage");

	const existingOrganizer = event.organizers.find(
		(organizer) => organizer.organization.id === input.organizationId,
	);
	if (existingOrganizer != null)
		throw new ConflictError(
			"Organization is already an organizer of the event.",
			existingOrganizer,
		);

	if (input.intendedRole === "co_host") {
		const existingPendingInvite = await invitationRepository.findPendingInvitation(
			eventId,
			input.organizationId,
		);
		if (existingPendingInvite != null) {
			// todo: should i return silently?
			throw new ConflictError(
				"There is already a pending invite for the organization",
				existingPendingInvite,
			);
		} else {
			return await invitationRepository.sendInvitation({
				eventId: eventId,
				invitedByUserId: input.userRoleId,
				senderOrganizationId: hostOrganizer.organization.id,
				recipientOrganizationId: input.organizationId,
				intendedRole: input.intendedRole,
			});
		}
	} else if (input.intendedRole === "resource_provider") {
		return await repository.insertEventOrganizer({
			eventId: eventId,
			organizationId: input.organizationId,
			role: "resource_provider",
		});
	} else {
		unreachable();
	}
}

export async function removeEventOrganizer(
	eventId: number,
	organizerId: number,
	user: { id: number; type: UserType },
) {
	const event = await eventRepository.findEventById(eventId);
	if (event == null) throw new NotFoundError("Event not found");

	const existingOrganizer = event.organizers.find((organizer) => organizer.id === organizerId);
	if (existingOrganizer == null) throw new ConflictError("Organizer not found."); // todo: decide whether to return silently or not

	const hostOrganizers = event.organizers.filter((organizer) => organizer.role === "host");
	if (hostOrganizers.length !== 1 || hostOrganizers[0] == null) unreachable();
	const hostOrganizer = hostOrganizers[0]; // note: only host can do stuff.

	// check if the user is in host org + has permission to perform
	const canManageOrganizers = await hasPermissionInManagedEntity(
		user,
		"organization",
		[hostOrganizer.organization.id], // only hosts
		"event_organizer:manage",
	);
	if (!canManageOrganizers)
		throw new ForbiddenError("You do not have permission to manage this event's organizers");

	if (event.status !== "draft")
		throw new ForbiddenError("Organizers can only be removed during draft stage");

	if (existingOrganizer.role === "host")
		throw new ConflictError("Cannot remove host of the event.");

	return await repository.removeEventOrganizer(organizerId);
}
