import { getAuthenticatedUser, ok } from "@/lib/helpers.js";
import { eventScopedSchema } from "@/modules/event/schema.js";
import {
	invitationItemScopedSchema,
	respondToInvitationSchema,
	revokeInvitationSchema,
} from "./schema.js";
import * as service from "./service.js";

export const getEventInvitations: ApiRequestHandler<
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
> = async (req, res) => {
	const params = eventScopedSchema.parse(req.params);
	const result = await service.getEventInvitations(params.eventId);
	return ok(res, result);
};

export const respondToInvitation: ApiRequestHandler<{
	id: number;
}> = async (req, res) => {
	const user = getAuthenticatedUser(req);
	const params = invitationItemScopedSchema.parse(req.params);
	const body = respondToInvitationSchema.parse(req.body);
	const result = await service.respondToInvitation(params.eventId, params.invitationId, body, user);
	return ok(res, result);
};

export const revokeInvitation: ApiRequestHandler<null> = async (req, res) => {
	const user = getAuthenticatedUser(req);
	const params = invitationItemScopedSchema.parse(req.params);
	const body = revokeInvitationSchema.parse(req.body);
	await service.revokeInvitation(params.eventId, params.invitationId, body, user);
	return ok(res, null);
};
