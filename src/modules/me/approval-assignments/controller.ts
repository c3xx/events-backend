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
		id: number;
		status: WorkflowInstanceStepAssignmentStatus;
		remarks: string | null;
		completedAt: string | null;
		step: {
			id: number;
			name: string;
			status: WorkflowInstanceStepStatus;
		};
		role: {
			id: number;
			name: string;
			scope: {
				type: "organization" | "venue";
				kindId: number;
				kindName: string;
			};
		};
		scope: {
			type: "organization" | "venue";
			id: number;
			name: string;
		};
	}[],
	schemas.EventParamsSchema
> = async (req, res) => {
	const user = getAuthenticatedUser(req);
	const params = schemas.eventParamsSchema.parse(req.params);
	const result = await service.getEventAssignments(user.id, params.eventId);
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
