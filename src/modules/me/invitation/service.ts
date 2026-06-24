import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors.js";
import * as organizationMemberRepository from "@/modules/organization/member/repository.js";
import { hasPermissionInManagedEntity } from "@/modules/permission/repository.js";
import * as userRepository from "@/modules/user/repository.js";
import * as repository from "./repository.js";
import type * as schemas from "./schema.js";

export async function getPendingInvitations(user: AuthenticatedUser) {
	const userOrganizations = await userRepository.getUserOrganizations(
		user.id,
		"event_organizer_invitation:respond",
	);
	if (userOrganizations.length === 0) return [];

	return repository.findPendingInvitationsForUser({
		userId: user.id,
		organizationIds: userOrganizations.map((org) => org.id),
	});
}

export async function getPendingInvitation(user: AuthenticatedUser, invitationId: number) {
	const invitation = await repository.findPendingInvitationById(invitationId);
	if (invitation == null) throw new NotFoundError("Invitation not found");

	const canManageInvitationsInRecipientOrg = await hasPermissionInManagedEntity(
		user,
		"organization",
		[invitation.recipientOrganization.id],
		"event_organizer_invitation:respond",
	);
	if (!canManageInvitationsInRecipientOrg)
		throw new ForbiddenError("You don't have permission to view this invitation");

	return invitation;
}

export async function respondToInvitation(
	user: AuthenticatedUser,
	invitationId: number,
	input: schemas.RespondToInvitationSchema,
) {
	const invitation = await repository.findPendingInvitationByIdSimple(invitationId);
	if (invitation == null) throw new NotFoundError("Invitation not found");

	const userRoleInUse = await organizationMemberRepository.findOrganizerMemberWithRole({
		organizationId: invitation.recipientOrganizationId,
		userId: user.id,
		roleId: input.roleId,
	});
	if (userRoleInUse == null)
		throw new ForbiddenError("You don't have the chosen role in the recipient organization");

	// can respond to invites under the recipient org with the given user-role id?
	const canRespondToOrganizerInvitations = await hasPermissionInManagedEntity(
		user,
		"organization",
		[invitation.recipientOrganizationId],
		"event_organizer_invitation:respond",
		userRoleInUse.id,
	);
	if (!canRespondToOrganizerInvitations)
		throw new ForbiddenError("You do not have permission to respond to this invite.");

	if (invitation.status !== "pending")
		throw new ConflictError("The invitation is either expired or has already been responded to");

	await repository.respondToInvitation(invitation.eventId, invitationId, {
		status: input.status,
		respondedByUserId: userRoleInUse.id,
		recipientOrganizationId: invitation.recipientOrganizationId,
	});
}
