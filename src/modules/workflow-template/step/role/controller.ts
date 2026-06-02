import { ok } from "@/lib/helpers.js";
import type { WorkflowTemplateStepScope } from "@/modules/workflow-template/scopes.js";
import * as schemas from "./schema.js";
import * as service from "./service.js";

export const getAllWorkflowTemplateStepRoles: ScopedApiRequestHandler<
	WorkflowTemplateStepScope,
	{
		role: {
			id: number;
			name: string;
		};
		targetGroupApprovalCriteria: WorkflowTargetGroupApprovalCriteria;
	}[]
> = async (_req, res) => {
	const result = await service.getAllWorkflowTemplateStepRoles(res.locals.templateStep);
	return ok(res, result);
};

export const assignRoleToWorkflowTemplateStep: ScopedApiRequestHandler<
	WorkflowTemplateStepScope,
	true
> = async (req, res) => {
	const body = schemas.assignRoleToWorkflowTemplateStepSchema.parse(req.body);
	await service.assignRoleToWorkflowTemplateStep(res.locals.templateStep, body);
	return ok(res, true);
};

export const unassignRoleFromWorkflowTemplateStep: ScopedApiRequestHandler<
	WorkflowTemplateStepScope,
	true
> = async (req, res) => {
	const params = schemas.stepRoleScopedSchema.parse(req.params);
	await service.unassignRoleFromWorkflowTemplateStep(res.locals.templateStep.id, params.roleId);
	return ok(res, true);
};
