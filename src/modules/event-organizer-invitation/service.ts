import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors.js";
import * as eventRepository from "@/modules/event/repository.js";
import * as repository from "./repository.js";
import type { RespondToInvitationSchema, SendInvitationSchema } from "./schema.js";
import { hasPermissionInManagedEntity } from "@/modules/permission/repository.js";

export async function getEventInvitations(eventId: number) {
	const event = await eventRepository.findEventById(eventId);
	if (event == null) throw new NotFoundError("Event not found");

	return await repository.getEventInvitations(eventId);
}

export async function sendInvitation(
	eventId: number,
	input: SendInvitationSchema,
	user: { id: number; type: UserType },
) {
	const event = await eventRepository.findEventById(eventId);
	if (event == null) throw new NotFoundError("Event not found");

	if (event.status !== "draft") {
		throw new ForbiddenError("Invitations can only be sent while the event is in Draft status");
	}

	const eventOrganizer = await repository.findEventOrganizerUser(eventId, user.id);
	if (eventOrganizer == null) {
		throw new ForbiddenError("Your organization not an organizer of the event");
	}

	const canSend = await hasPermissionInManagedEntity(
		user,
		"organization",
		[eventOrganizer.organizationId],
		"event_organizer_invitation:send",
	);
	if (!canSend) {
		throw new ForbiddenError("You do not have permission to send invitation");
	}

	if (eventOrganizer.organizationId === input.recipientOrganizationId) {
		throw new ConflictError("Cannot send invite to your own organization");
	}

	const existingPendingInvite = await repository.findPendingInvitation(
		eventId,
		input.recipientOrganizationId,
	);
	if (existingPendingInvite != null) {
		throw new ConflictError("There is already a pending invitation for the recipient organization");
	}

	return await repository.sendInvitation({
		eventId,
		invitedByUserId: eventOrganizer.userRoleId,
		senderOrganizationId: eventOrganizer.organizationId,
		recipientOrganizationId: input.recipientOrganizationId,
	});
}

export async function respondToInvitation(
	eventId: number,
	invitationId: number,
	input: RespondToInvitationSchema,
	user: { id: number; type: UserType },
) {
	const event = await eventRepository.findEventById(eventId);
	if (event == null) throw new NotFoundError("Event not found");

	const invitation = await repository.findInvitationById(eventId, invitationId);
	if (invitation == null) {
		throw new NotFoundError("Invitation not found");
	}

	if (invitation.status !== "pending") {
		throw new ConflictError("The invitation has already been responded to");
	}

	const userRole = await repository.findUserRoleInOrganization(
		user.id,
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
	if (input.status === "accepted") {
		const existingOrganizer = await repository.findOrganizerByOrganization(
			eventId,
			invitation.recipientOrganizationId,
		);
		if (existingOrganizer != null) {
			throw new ConflictError("Your organization is already an organizer of the event");
		}
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
	user: { id: number; type: UserType },
) {
	const event = await eventRepository.findEventById(eventId);
	if (event == null) throw new NotFoundError("Event not found");

	const invitation = await repository.findInvitationById(eventId, invitationId);
	if (invitation == null) throw new NotFoundError("Invitation not found");

	if (invitation.status !== "pending") {
		throw new ConflictError("Only pending invitations can be revoked");
	}
	const eventOrganizer = await repository.findEventOrganizerUser(eventId, user.id);
	if (eventOrganizer == null) {
		throw new ForbiddenError("Your organization is not an organizer of this event");
	}

	if (invitation.senderOrganizationId !== eventOrganizer.organizationId) {
		throw new ForbiddenError("Only the sender organization can revoke this invitation");
	}

	return await repository.revokeInvitation(invitationId);
}
