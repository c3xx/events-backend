import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors.js";
import * as eventRepository from "@/modules/event/repository.js";
import { hasPermissionInManagedEntity } from "@/modules/permission/repository.js";
import * as repository from "./repository.js";
import type { RespondToInvitationSchema } from "./schema.js";

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
	if (invitation == null) {
		throw new NotFoundError("Invitation not found");
	}

	if (invitation.status !== "pending") {
		throw new ConflictError("The invitation has already been responded to");
	}

	const userRole = await repository.findUserRoleInOrganization(
		user.id,
		input.userRoleId,
		invitation.recipientOrganizationId,
	);

	if (userRole == null) {
		throw new ForbiddenError("Only recipient organization can respond to invitation");
	}

	const canRespond = await hasPermissionInManagedEntity(
		user,
		"organization",
		[invitation.recipientOrganizationId],
		"event_organizer_invitation:respond",
	);

	if (!canRespond) {
		throw new ForbiddenError("You do not have permission to respond to this invite.");
	}

	return await repository.respondToInvitation(invitationId, {
		status: input.status,
		respondedByUserId: userRole.userRoleId,
		eventId,
		recipientOrganizationId: invitation.recipientOrganizationId,
	});
}

export async function revokeInvitation(
	eventId: number,
	invitationId: number,
	userRoleId: number,
	user: { id: number; type: UserType },
) {
	const event = await eventRepository.findEventById(eventId);
	if (event == null) throw new NotFoundError("Event not found");

	const invitation = await repository.findInvitationById(invitationId);
	if (invitation == null) throw new NotFoundError("Invitation not found");

	if (invitation.status !== "pending") {
		throw new ConflictError("Only pending invitations can be revoked");
	}
	const eventOrganizer = await repository.findEventOrganizerUser(eventId, user.id, userRoleId);
	if (eventOrganizer == null) {
		throw new ForbiddenError("Your organization is not an organizer of this event");
	}
	if (eventOrganizer.organizationId !== invitation.senderOrganizationId) {
		throw new ForbiddenError("You can only revoke invitations sent by your own organization");
	}

	const canRevoke = await hasPermissionInManagedEntity(
		user,
		"organization",
		[eventOrganizer.organizationId],
		"event_organizer_invitation:send",
	);
	if (!canRevoke) {
		throw new ForbiddenError("You do not have permission to revoke this invitation");
	}

	return await repository.revokeInvitation(invitationId);
}
