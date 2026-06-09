import { getAuthenticatedUser, ok } from "@/lib/helpers.js";
import type { eventScope } from "../scopes.js";
import * as service from "./service.js";

export const getLatestWorkflowInstance: ScopedApiRequestHandler<
	eventScope,
	workflowInstance
> = async (req, res) => {
	const user = getAuthenticatedUser(req);
	const result = await service.getLatestWorkflowInstance(user, res.locals.event);
	return ok(res, result);
};

type workflowInstance = {
	id: number;
	createdAt: string;
	initialStepId: number | null;
	status: WorkflowInstanceStatus;
	completedAt: string | null;
	eventId: number;
	submittedBy: number;
	steps: {
		id: number;
		name: string;
		nextStepId: number | null;
		status: WorkflowInstanceStepStatus;
		stepRoles: {
			roleId: number;
			targetGroupApprovalCriteria: WorkflowTargetGroupApprovalCriteria;
			id: number;
			targetGroups: {
				id: number;
				managedEntityId: number;
				assignments: {
					id: number;
					status: WorkflowInstanceStepAssignmentStatus;
					completedAt: string | null;
					userRole: {
						id: number;
						role: {
							id: number;
							name: string;
						};
						user: {
							id: number;
							fullName: string;
						};
					};
				}[];
			}[];
		}[];
	}[];
};
