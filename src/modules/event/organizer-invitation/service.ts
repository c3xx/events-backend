import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors.js";
import type { EventScope } from "@/modules/event/scopes.js";
import * as organizationMemberRepository from "@/modules/organization/member/repository.js";
import { hasPermissionInManagedEntity } from "@/modules/permission/repository.js";
import * as repository from "./repository.js";
import type { RevokeInvitationSchema } from "./schema.js";

export async function getEventInvitations(event: EventScope["event"]) {
	return await repository.getEventInvitations(event.id);
}

export async function revokeInvitation(
	event: EventScope["event"],
	invitationId: number,
	input: RevokeInvitationSchema,
	user: AuthenticatedUser,
) {
	const invitation = await repository.findInvitationById(event.id, invitationId);
	if (invitation == null) throw new NotFoundError("Invitation not found");

	if (invitation.status !== "pending")
		throw new ConflictError("Only pending invitations can be revoked");

	const userRoleInUse = await organizationMemberRepository.findOrganizerMemberWithRole({
		organizationId: invitation.senderOrganizationId,
		userId: user.id,
		roleId: input.roleId,
	});
	if (userRoleInUse == null)
		throw new ForbiddenError("You don't have the chosen role in the sender organization");

	// can manage organizers under the sender org with the given user-role id?
	const canManageEventOrganizers = await hasPermissionInManagedEntity(
		user,
		"organization",
		[invitation.senderOrganizationId],
		"event:manage",
		userRoleInUse.id,
	);
	if (!canManageEventOrganizers)
		throw new ForbiddenError("You do not have permission to revoke this invitation");

	return await repository.revokeInvitation(event.id, invitationId);
}
