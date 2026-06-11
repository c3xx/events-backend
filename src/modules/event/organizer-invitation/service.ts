import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors.js";
import * as eventRepository from "@/modules/event/repository.js";
import { hasPermissionInManagedEntity } from "@/modules/permission/repository.js";
import * as repository from "./repository.js";
import type { RespondToInvitationSchema, RevokeInvitationSchema } from "./schema.js";

export async function getEventInvitations(eventId: number) {
	const event = await eventRepository.findEventById(eventId);
	if (event == null) throw new NotFoundError("Event not found");
	return await repository.getEventInvitations(eventId);
}

export async function respondToInvitation(
	eventId: number,
	invitationId: number,
	input: RespondToInvitationSchema,
	user: { id: number; type: UserType },
) {
	const event = await eventRepository.findEventById(eventId);
	if (event == null) throw new NotFoundError("Event not found");

	const invitation = await repository.findInvitationById(invitationId);
	if (invitation == null) throw new NotFoundError("Invitation not found");

	// can respond to invites under the recipient org with the given user-role id?
	const canRespondToOrganizerInvitations = await hasPermissionInManagedEntity(
		user,
		"organization",
		[invitation.recipientOrganizationId],
		"event_organizer_invitation:respond",
		input.userRoleId,
	);
	if (!canRespondToOrganizerInvitations)
		throw new ForbiddenError("You do not have permission to respond to this invite.");

	if (invitation.status !== "pending")
		throw new ConflictError("The invitation is either expired or already responded to");

	return await repository.respondToInvitation(eventId, invitationId, {
		status: input.status,
		respondedByUserId: input.userRoleId,
		recipientOrganizationId: invitation.recipientOrganizationId,
	});
}

export async function revokeInvitation(
	eventId: number,
	invitationId: number,
	input: RevokeInvitationSchema,
	user: { id: number; type: UserType },
) {
	const event = await eventRepository.findEventById(eventId);
	if (event == null) throw new NotFoundError("Event not found");

	const invitation = await repository.findInvitationById(invitationId);
	if (invitation == null) throw new NotFoundError("Invitation not found");

	if (invitation.status !== "pending")
		throw new ConflictError("Only pending invitations can be revoked");

	// can manage organizers under the sender org with the given user-role id?
	const canManageEventOrganizers = await hasPermissionInManagedEntity(
		user,
		"organization",
		[invitation.senderOrganizationId],
		"event_organizer:manage",
		input.userRoleId,
	);
	if (!canManageEventOrganizers)
		throw new ForbiddenError("You do not have permission to revoke this invitation");

	return await repository.revokeInvitation(invitationId);
}
