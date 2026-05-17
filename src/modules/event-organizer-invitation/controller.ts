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
		status: "pending" | "accepted" | "rejected";
		invitedAt: string;
		closedAt: string | null;
		senderOrganization: { id: number; name: string };
		recipientOrganization: { id: number; name: string };
		invitedByUser: {
			id: number;
			user: { id: number; fullName: string };
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
	const result = await service.sendInvitation(params.eventId, body, user.id);
	return ok(res, result, 201);
};

export const respondToInvitation: ApiRequestHandler<{
	id: number;
	status: "accepted" | "rejected";
}> = async (req, res) => {
	const user = getAuthenticatedUser(req);
	const params = invitationItemScopedSchema.parse(req.params);
	const body = respondToInvitationSchema.parse(req.body);
	const result = await service.respondToInvitation(
		params.eventId,
		params.invitationId,
		body,
		user.id,
	);
	return ok(res, result);
};

export const revokeInvitation: ApiRequestHandler<{
	id: number;
}> = async (req, res) => {
	const user = getAuthenticatedUser(req);
	const params = invitationItemScopedSchema.parse(req.params);
	const result = await service.revokeInvitation(params.eventId, params.invitationId, user.id);
	return ok(res, result, 204);
};
