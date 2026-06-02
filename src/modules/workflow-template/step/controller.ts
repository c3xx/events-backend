import { ok } from "@/lib/helpers.js";
import type { WorkflowTemplateScope, WorkflowTemplateStepScope } from "../scopes.js";
import * as schemas from "./schema.js";
import * as service from "./service.js";

export const getWorkflowTemplateStep: ScopedApiRequestHandler<
	WorkflowTemplateStepScope,
	{
		id: number;
		name: string;
		nextStepId: number | null;
		stepRoles: {
			targetGroupApprovalCriteria: WorkflowTargetGroupApprovalCriteria;
			role: {
				id: number;
				name: string;
			};
		}[];
	}
> = async (_req, res) => {
	const result = await service.getWorkflowTemplateStep(res.locals.templateStep);
	return ok(res, result);
};

export const getAllWorkflowTemplateSteps: ScopedApiRequestHandler<
	WorkflowTemplateScope,
	{
		id: number;
		name: string;
		nextStepId: number | null;
	}[]
> = async (_req, res) => {
	const result = await service.getAllWorkflowTemplateSteps(res.locals.template);
	return ok(res, result);
};

export const createWorkflowTemplateStep: ScopedApiRequestHandler<
	WorkflowTemplateScope,
	{
		id: number;
		nextStepId: number | null;
	}
> = async (req, res) => {
	const body = schemas.createWorkflowTemplateStepSchema.parse(req.body);
	const result = await service.createWorkflowTemplateStep(res.locals.template, body);
	return ok(res, result);
};
