import { getAuthenticatedUser, ok } from "@/lib/helpers.js";
import * as schemas from "./schema.js";
import * as service from "./service.js";

export const getPendingAssignments: ApiRequestHandler<
	{
		assignmentId: number;
		status: WorkflowInstanceStepAssignmentStatus;
		remarks: string | null;
		userRoleId: number;
		role: { id: number; name: string };
		criteria: WorkflowTargetGroupApprovalCriteria;
		step: { id: number; name: string };
		event: { id: number; title: string };
	}[]
> = async (req, res) => {
	const user = getAuthenticatedUser(req);
	const result = await service.getPendingAssignments(user.id);
	return ok(res, result);
};

export const respondToAssignments: ApiRequestHandler<{ success: true }> = async (req, res) => {
	const user = getAuthenticatedUser(req);
	const body = schemas.respondToAssignmentsSchema.parse(req.body);
	const result = await service.respondToAssignments(user.id, body);
	return ok(res, result);
};
