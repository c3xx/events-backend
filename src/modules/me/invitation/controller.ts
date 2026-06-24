import { getAuthenticatedUser, ok } from "@/lib/helpers.js";
import * as schemas from "./schema.js";
import * as service from "./service.js";

export const getPendingInvitations: ApiRequestHandler<
	{
		id: number;
		intendedRole: EventOrganizerInvitationRole;
		invitedAt: string;
		event: {
			id: number;
			title: string;
			type: {
				id: number;
				name: string;
			};
			category: {
				id: number;
				name: string;
			};
		};
		sender: {
			id: number;
			fullName: string;
			role: {
				id: number;
				name: string;
			};
			organization: {
				id: number;
				name: string;
				type: {
					id: number;
					name: string;
				};
			};
		};
		recipientOrganization: {
			id: number;
			name: string;
			type: {
				id: number;
				name: string;
			};
		};
	}[]
> = async (req, res) => {
	const user = getAuthenticatedUser(req);
	const result = await service.getPendingInvitations(user);
	return ok(res, result);
};

export const getPendingInvitation: ApiRequestHandler<{
	id: number;
	intendedRole: EventOrganizerInvitationRole;
	invitedAt: string;
	event: {
		id: number;
		title: string;
		requestDetails: string;
		expectedParticipants: number;
		startsAt: string;
		endsAt: string;
		parentEvent: {
			id: number;
			title: string;
		} | null;
		type: {
			id: number;
			name: string;
		};
		category: {
			id: number;
			name: string;
		};
		organizers: {
			id: number;
			role: EventOrganizerRole;
			organization: {
				id: number;
				name: string;
			};
		}[];
	};
	sender: {
		id: number;
		fullName: string;
		role: {
			id: number;
			name: string;
		};
		organization: {
			id: number;
			name: string;
			type: {
				id: number;
				name: string;
			};
		};
	};
	recipientOrganization: {
		id: number;
		name: string;
		type: {
			id: number;
			name: string;
		};
	};
}> = async (req, res) => {
	const user = getAuthenticatedUser(req);
	const params = schemas.invitationScopedSchema.parse(req.params);
	const result = await service.getPendingInvitation(user, params.invitationId);
	return ok(res, result);
};

export const respondToInvitation: ApiRequestHandler<true> = async (req, res) => {
	const user = getAuthenticatedUser(req);
	const params = schemas.invitationScopedSchema.parse(req.params);
	const body = schemas.respondToInvitationSchema.parse(req.body);
	await service.respondToInvitation(user, params.invitationId, body);
	return ok(res, true);
};
