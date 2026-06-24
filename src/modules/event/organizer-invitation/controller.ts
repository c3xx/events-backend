import { getAuthenticatedUser, ok } from "@/lib/helpers.js";
import type { EventScope } from "@/modules/event/scopes.js";
import { invitationItemScopedSchema, revokeInvitationSchema } from "./schema.js";
import * as service from "./service.js";

export const getEventInvitations: ScopedApiRequestHandler<
	EventScope,
	{
		id: number;
		status: EventOrganizerInvitationStatus;
		invitedAt: string;
		closedAt: string | null;
		invitedByUser: {
			id: number;
			user: {
				id: number;
				fullName: string;
			};
		};
		senderOrganization: {
			id: number;
			name: string;
		};
		recipientOrganization: {
			id: number;
			name: string;
		};
	}[]
> = async (_req, res) => {
	const result = await service.getEventInvitations(res.locals.event);
	return ok(res, result);
};

export const revokeInvitation: ScopedApiRequestHandler<EventScope, true> = async (req, res) => {
	const user = getAuthenticatedUser(req);
	const params = invitationItemScopedSchema.parse(req.params);
	const body = revokeInvitationSchema.parse(req.body);
	await service.revokeInvitation(res.locals.event, params.invitationId, body, user);
	return ok(res, true);
};
