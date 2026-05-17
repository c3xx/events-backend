import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors.js";
import * as eventRepository from "@/modules/event/repository.js";
import * as repository from "./repository.js";
import type { RespondToInvitationSchema, SendInvitationSchema } from "./schema.js";

export async function getEventInvitations(eventId: number) {
	const event = await eventRepository.findEventById(eventId);
	if (event == null) throw new NotFoundError("Event not found");

	return await repository.getEventInvitations(eventId);
}

export async function sendInvitation(
	eventId: number,
	input: SendInvitationSchema,
	invitedByUserId: number,
) {
	const event = await eventRepository.findEventById(eventId);
	if (event == null) throw new NotFoundError("Event not found");

	if (event.status !== "draft") {
		throw new ForbiddenError("Invitations can only be sent while the event is in Draft status");
	}

	const clubHeadRole = await repository.findAcitveClubHead(invitedByUserId);
	if (clubHeadRole == null) {
		throw new ForbiddenError("You are not an active club head");
	}

	const organizer = await repository.findOrganizerByOrganization(
		eventId,
		clubHeadRole.organizationId,
	);
	if (organizer == null) {
		throw new ForbiddenError("Your club is not an organizer of the event");
	}

	if (clubHeadRole.organizationId === input.recipientOrganizationId) {
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
		invitedByUserId: clubHeadRole.userRoleId,
		senderOrganizationId: clubHeadRole.organizationId,
		recipientOrganizationId: input.recipientOrganizationId,
	});
}

export async function respondToInvitation(
	eventId: number,
	invitationId: number,
	input: RespondToInvitationSchema,
	respondedByUserId: number,
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

	const clubHeadRole = await repository.findAcitveClubHead(respondedByUserId);
	if (clubHeadRole == null) {
		throw new ForbiddenError("You are not an acitve club head");
	}

	if (invitation.recipientOrganizationId !== clubHeadRole.organizationId) {
		throw new ForbiddenError("Only recipient organization can respond to invitation");
	}

	return await repository.respondToInvitation(invitationId, {
		status: input.status,
		respondedByUserId: clubHeadRole.userRoleId,
	});
}

export async function revokeInvitation(
	eventId: number,
	invitationId: number,
	revokerUserId: number,
) {
	const event = await eventRepository.findEventById(eventId);
	if (event == null) throw new NotFoundError("Event not found");

	const invitation = await repository.findInvitationById(eventId, invitationId);
	if (invitation == null) throw new NotFoundError("Invitation not found");

	if (invitation.status !== "pending") {
		throw new ConflictError("Only pending invitations can be revoked");
	}

	const clubHeadRole = await repository.findAcitveClubHead(revokerUserId);
	if (clubHeadRole == null) {
		throw new ForbiddenError("You are not an active club head");
	}
	if (invitation.senderOrganizationId !== clubHeadRole.organizationId) {
		throw new ForbiddenError("Only sender organization can revoke the invitaion");
	}

	return await repository.revokeInvitation(invitationId);
}
