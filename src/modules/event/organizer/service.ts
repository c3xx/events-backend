import { ConflictError, ForbiddenError } from "@/lib/errors.js";
import { unreachable } from "@/lib/helpers.js";
import * as invitationRepository from "@/modules/event/organizer-invitation/repository.js";
import type { EventScope } from "@/modules/event/scopes.js";
import * as organizationMemberRepository from "@/modules/organization/member/repository.js";
import { hasPermissionInManagedEntity } from "@/modules/permission/repository.js";
import * as repository from "./repository.js";
import type { AddEventOrganizerSchema } from "./schema.js";

export async function getEventOrganizers(event: EventScope["event"]) {
	return event.organizers;
}

export async function addEventOrganizer(
	event: EventScope["event"],
	input: AddEventOrganizerSchema,
	user: AuthenticatedUser,
) {
	const hostOrganizers = event.organizers.filter((organizer) => organizer.role === "host");
	if (hostOrganizers.length !== 1 || hostOrganizers[0] == null) unreachable();
	const hostOrganizer = hostOrganizers[0]; // note: only host can do stuff.

	// todo: decide whether these actions are host-only. or implemenet permissions

	const userRoleInUse = await organizationMemberRepository.findOrganizerMemberWithRole({
		organizationId: hostOrganizer.organization.id,
		userId: user.id,
		roleId: input.roleId,
	});
	if (userRoleInUse == null)
		throw new ForbiddenError(
			"You don't have the chosen role in the host organization in order to add organizers",
		);

	// check if the user is in host org + has permission to perform + with the given userroleid
	const canManageOrganizers = await hasPermissionInManagedEntity(
		user,
		"organization",
		[hostOrganizer.organization.id], // only hosts can
		"event_organizer:manage",
		userRoleInUse.id,
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
			event.id,
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
				eventId: event.id,
				invitedByUserId: userRoleInUse.id,
				senderOrganizationId: hostOrganizer.organization.id,
				recipientOrganizationId: input.organizationId,
				intendedRole: input.intendedRole,
			});
		}
	} else if (input.intendedRole === "resource_provider") {
		return await repository.insertEventOrganizer({
			eventId: event.id,
			organizationId: input.organizationId,
			role: "resource_provider",
		});
	} else {
		unreachable();
	}
}

export async function removeEventOrganizer(
	event: EventScope["event"],
	organizerId: number,
	user: AuthenticatedUser,
) {
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
