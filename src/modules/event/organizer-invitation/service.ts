import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors.js";
import type { EventScope } from "@/modules/event/scopes.js";
import { hasPermissionInManagedEntity } from "@/modules/permission/repository.js";
import * as repository from "./repository.js";
import type { RespondToInvitationSchema, RevokeInvitationSchema } from "./schema.js";

export async function getEventInvitations(event: EventScope["event"]) {
	return await repository.getEventInvitations(event.id);
}

export async function respondToInvitation(
	event: EventScope["event"],
	invitationId: number,
	input: RespondToInvitationSchema,
	user: { id: number; type: UserType },
) {
	const invitation = await repository.findInvitationById(event.id, invitationId);
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

	return await repository.respondToInvitation(event.id, invitationId, {
		status: input.status,
		respondedByUserId: input.userRoleId,
		recipientOrganizationId: invitation.recipientOrganizationId,
	});
}

export async function revokeInvitation(
	event: EventScope["event"],
	invitationId: number,
	input: RevokeInvitationSchema,
	user: { id: number; type: UserType },
) {
	const invitation = await repository.findInvitationById(event.id, invitationId);
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

	return await repository.revokeInvitation(event.id, invitationId);
}
