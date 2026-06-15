import { getAuthenticatedUser, ok } from "@/lib/helpers.js";
import * as schemas from "./schema.js";
import * as service from "./service.js";

export const getPendingApprovalEvents: ApiRequestHandler<
	{
		id: number;
		title: string;
		status: EventStatus;
		startsAt: string;
		endsAt: string;
	}[]
> = async (req, res) => {
	const user = getAuthenticatedUser(req);
	const result = await service.getPendingApprovalEvents(user.id);
	return ok(res, result);
};

export const getEventAssignments: ApiRequestHandler<
	{
		assignmentId: number;
		status: WorkflowInstanceStepAssignmentStatus;
		remarks: string | null;
		completedAt: string | null;
		userRoleId: number;
		user: { id: number; fullName: string };
		role: { id: number; name: string };
		step: { id: number; name: string; status: WorkflowInstanceStepStatus };
		targetGroup: {
			id: number;
			type: "organization" | "venue";
			organizationId: number | null;
			venueId: number | null;
			name: string;
		};
	}[],
	schemas.EventParamsSchema
> = async (req, res) => {
	const params = schemas.eventParamsSchema.parse(req.params);
	const result = await service.getEventAssignments(params.eventId);
	return ok(res, result);
};

export const respondToAssignments: ApiRequestHandler<
	true,
	schemas.EventParamsSchema,
	schemas.RespondToAssignmentsSchema
> = async (req, res) => {
	const user = getAuthenticatedUser(req);
	const params = schemas.eventParamsSchema.parse(req.params);
	const body = schemas.respondToAssignmentsSchema.parse(req.body);
	await service.respondToAssignments(user.id, params.eventId, body);
	return ok(res, true);
};
