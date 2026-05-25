import type { EVENT_ORGANIZER_INVITATION_STATUS } from "@/lib/constants.js";
import { getAuthenticatedUser, ok } from "@/lib/helpers.js";
import {
	invitationItemScopedSchema,
	invitationScopedSchema,
	respondToInvitationSchema,
	sendInvitationSchema,
} from "./schema.js";
import * as service from "./service.js";

export const getEventInvitations: ApiRequestHandler<
	{
		id: number;
		status: (typeof EVENT_ORGANIZER_INVITATION_STATUS)[number];
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
	const params = invitationScopedSchema.parse(req.params);
	const result = await service.getEventInvitations(params.eventId);
	return ok(res, result);
};

export const sendInvitation: ApiRequestHandler<{
	id: number;
}> = async (req, res) => {
	const user = getAuthenticatedUser(req);
	const params = invitationScopedSchema.parse(req.params);
	const body = sendInvitationSchema.parse(req.body);
	const result = await service.sendInvitation(params.eventId, body, user);
	return ok(res, result, 201);
};

export const respondToInvitation: ApiRequestHandler<{
	id: number;
	status: (typeof EVENT_ORGANIZER_INVITATION_STATUS)[number];
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
	await service.revokeInvitation(params.eventId, params.invitationId, user);
	return ok(res, null);
};
